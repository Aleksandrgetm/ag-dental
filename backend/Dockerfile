# Build context: backend/. No credentials or migrations are baked into the runtime.
FROM golang:1.27.2-bookworm AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/ag-api ./cmd/api

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates ffmpeg webp \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --gid 10001 ag && useradd --uid 10001 --gid ag --no-create-home ag
WORKDIR /app
COPY --from=build --chown=10001:10001 /out/ag-api ./ag-api
USER 10001:10001
ENV PORT=8080 MEDIA_UPLOADS_ENABLED=false
EXPOSE 8080
ENTRYPOINT ["/app/ag-api"]
