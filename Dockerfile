# Wendao Frontend (Qianji Studio) Dockerfile
#
# Build context MUST be the wendao-frontend/ directory itself, NOT the repo
# root.  Keeping the context narrow prevents Docker from sending gigabytes of
# unrelated artefacts (Rust target/, Python venvs, other sub-repos, etc.).

# ---------------------------------------------------------------------------- #
#                                 BUILD STAGE                                  #
# ---------------------------------------------------------------------------- #

FROM node:24-bookworm AS builder

WORKDIR /app

# Install dependencies first so they can be cached when package.json hasn't changed.
COPY package*.json ./
RUN npm ci

# Copy the rest of the source tree.
COPY . ./

# Build production bundle (skip bundle-size audits – they are checked in CI).
ENV NODE_ENV=production
RUN npx rspack build

# ---------------------------------------------------------------------------- #
#                               PRODUCTION STAGE                               #
# ---------------------------------------------------------------------------- #

FROM nginx:alpine AS production

# Serve the built static assets.
COPY --from=builder /app/dist /usr/share/nginx/html

# nginx configuration (kept inside the frontend directory so the build context
# is self-contained).
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
