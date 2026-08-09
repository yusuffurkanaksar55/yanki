ARG NODE_IMAGE=node:22-alpine@sha256:c610fcdfb1d5b4740dd70c284ed3cb16bb857e0f7166196e36a5501df7a3aa32
ARG NGINX_IMAGE=nginx:1.28-alpine@sha256:a8b39bd9cf0f83869a2162827a0caf6137ddf759d50a171451b335cecc87d236
ARG OCI_SOURCE=https://github.com/yusuffurkanaksar55/yanki
ARG OCI_REVISION=development
ARG OCI_VERSION=development

FROM ${NODE_IMAGE} AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM ${NGINX_IMAGE} AS runtime

ARG OCI_SOURCE
ARG OCI_REVISION
ARG OCI_VERSION

LABEL org.opencontainers.image.title="Yanki" \
  org.opencontainers.image.description="Anonymous employee and project evaluation platform" \
  org.opencontainers.image.source="${OCI_SOURCE}" \
  org.opencontainers.image.revision="${OCI_REVISION}" \
  org.opencontainers.image.version="${OCI_VERSION}"

ENV NGINX_ENTRYPOINT_LOCAL_RESOLVERS=1
ENV NGINX_ENVSUBST_FILTER=^(SUPABASE_UPSTREAM_URL|NGINX_LOCAL_RESOLVERS|YANKI_SENSITIVE_GATEWAY_TOKEN)$

COPY deploy/nginx.conf /etc/nginx/templates/default.conf.template
COPY deploy/40-write-runtime-config.sh /docker-entrypoint.d/40-write-runtime-config.sh
COPY --from=build /app/dist /usr/share/nginx/html

RUN chmod +x /docker-entrypoint.d/40-write-runtime-config.sh

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/healthz >/dev/null || exit 1
