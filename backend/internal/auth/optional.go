package auth

import "github.com/gin-gonic/gin"

// OptionalAuth permits guests only when Authorization is absent. Supplied
// credentials must pass the same verification and role lookup as protected APIs.
// Invalid credentials never silently downgrade a request to a guest booking.
func OptionalAuth(v Verifier, roles Roles) gin.HandlerFunc {
	require := RequireAuth(v, roles)
	return func(c *gin.Context) {
		c.Header("Cache-Control", "no-store")
		headers := c.Request.Header.Values("Authorization")
		if len(headers) == 0 {
			c.Next()
			return
		}
		if len(headers) != 1 || headers[0] == "" {
			c.AbortWithStatusJSON(401, gin.H{"error": "unauthorized"})
			return
		}
		require(c)
	}
}
