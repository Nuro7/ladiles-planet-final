FROM node:24-bookworm-slim AS frontend
WORKDIR /build/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ENV VITE_API_URL=/api
RUN npm run build

FROM node:24-bookworm-slim
ENV NODE_ENV=production HOST=0.0.0.0 PORT=5050 FLOW_MCP_AUTOSTART=false FFMPEG_PATH=/usr/bin/ffmpeg
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg ca-certificates fonts-liberation util-linux && rm -rf /var/lib/apt/lists/*
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY backend/server.js ./
COPY backend/config ./config
COPY backend/controllers ./controllers
COPY backend/db ./db
COPY backend/middleware ./middleware
COPY backend/repositories ./repositories
COPY backend/routes ./routes
COPY backend/services ./services
COPY backend/utils ./utils
COPY backend/websocket ./websocket
COPY backend/assets ./assets
COPY backend/vendor ./vendor
COPY backend/scripts/clean-visible-logo.js ./scripts/clean-visible-logo.js
COPY --from=frontend /build/frontend/dist /app/frontend/dist
RUN mkdir -p data && chown -R node:node /app
USER node
VOLUME ["/app/backend/data"]
EXPOSE 5050
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/api/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
# Lock the shared data volume: two containers must never write its JSON state.
CMD ["flock", "-n", "-E", "75", "-F", "/app/backend/data/.instance.lock", "node", "server.js"]
