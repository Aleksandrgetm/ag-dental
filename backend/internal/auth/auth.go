// Package auth verifies access tokens with the configured Supabase Auth server.
// No unverified JWT claims or client-supplied roles are used for authorization.
package auth

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type Identity struct {
	ID    string `json:"id"`
	Email string `json:"email"`
	Role  string `json:"role"`
}
type Verifier interface {
	Verify(context.Context, string) (Identity, error)
}
type Roles interface {
	Lookup(context.Context, string) (string, error)
}
type SupabaseVerifier struct {
	endpoint, key string
	client        *http.Client
}

var uuid = regexp.MustCompile(`^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$`)
var ErrInvalid = errors.New("invalid credentials")

func NewVerifier(base, key string) (*SupabaseVerifier, error) {
	u, err := url.Parse(base)
	if err != nil || u.Scheme != "https" || u.Host == "" || u.User != nil || u.RawQuery != "" || u.Fragment != "" || (u.Path != "" && u.Path != "/") || key == "" || strings.HasPrefix(key, "sb_secret_") {
		return nil, errors.New("configure SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY")
	}
	return &SupabaseVerifier{strings.TrimRight(base, "/") + "/auth/v1/user", key, &http.Client{Timeout: 8 * time.Second, CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }}}, nil
}
func (v *SupabaseVerifier) Verify(ctx context.Context, token string) (Identity, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, v.endpoint, nil)
	if err != nil {
		return Identity{}, err
	}
	req.Header.Set("apikey", v.key)
	req.Header.Set("Authorization", "Bearer "+token)
	res, err := v.client.Do(req)
	if err != nil {
		return Identity{}, errors.New("authentication unavailable")
	}
	defer res.Body.Close()
	if res.StatusCode == 401 || res.StatusCode == 403 {
		return Identity{}, ErrInvalid
	}
	if res.StatusCode != http.StatusOK {
		return Identity{}, errors.New("authentication unavailable")
	}
	var user struct {
		ID        string `json:"id"`
		Email     string `json:"email"`
		Audience  string `json:"aud"`
		Anonymous bool   `json:"is_anonymous"`
	}
	if json.NewDecoder(io.LimitReader(res.Body, 65536)).Decode(&user) != nil || !uuid.MatchString(user.ID) || user.Audience != "authenticated" || user.Anonymous {
		return Identity{}, ErrInvalid
	}
	return Identity{ID: user.ID, Email: user.Email}, nil
}

type DatabaseRoles struct{ DB *gorm.DB }

func (r DatabaseRoles) Lookup(ctx context.Context, id string) (string, error) {
	var row struct{ Role string }
	err := r.DB.WithContext(ctx).Table("public.user_roles").Where("user_id = ?", id).Take(&row).Error
	if err != nil {
		return "", err
	}
	if row.Role != "user" && row.Role != "admin" {
		return "", errors.New("invalid role")
	}
	return row.Role, nil
}
func RequireAuth(v Verifier, roles Roles) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Cache-Control", "no-store")
		fields := strings.Fields(c.GetHeader("Authorization"))
		if len(fields) != 2 || !strings.EqualFold(fields[0], "Bearer") || len(fields[1]) > 16384 {
			c.AbortWithStatusJSON(401, gin.H{"error": "unauthorized"})
			return
		}
		if v == nil {
			c.AbortWithStatusJSON(503, gin.H{"error": "auth_unavailable"})
			return
		}
		identity, err := v.Verify(c.Request.Context(), fields[1])
		if err != nil {
			status := 503
			if errors.Is(err, ErrInvalid) {
				status = 401
			}
			c.AbortWithStatusJSON(status, gin.H{"error": "authentication_failed"})
			return
		}
		role, err := roles.Lookup(c.Request.Context(), identity.ID)
		if err != nil {
			c.AbortWithStatusJSON(503, gin.H{"error": "role_unavailable"})
			return
		}
		identity.Role = role
		c.Set("auth.identity", identity)
		c.Next()
	}
}
func RequireRole(role string) gin.HandlerFunc {
	return func(c *gin.Context) {
		identity, ok := Current(c)
		if !ok {
			c.AbortWithStatusJSON(401, gin.H{"error": "unauthorized"})
			return
		}
		if (role != "user" && role != "admin") || identity.Role != role {
			c.AbortWithStatusJSON(403, gin.H{"error": "forbidden"})
			return
		}
		c.Next()
	}
}
func Current(c *gin.Context) (Identity, bool) {
	v, ok := c.Get("auth.identity")
	i, valid := v.(Identity)
	return i, ok && valid
}
func Me(c *gin.Context) {
	i, ok := Current(c)
	if !ok {
		c.AbortWithStatus(401)
		return
	}
	c.JSON(200, i)
}
