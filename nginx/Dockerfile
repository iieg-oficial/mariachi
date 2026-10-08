# syntax=docker/dockerfile:1
FROM node:26-alpine AS widget-builder
WORKDIR /widget
COPY ./widget/package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --prefer-offline --no-audit --fund=false
COPY ./widget/ .
RUN --mount=type=cache,target=/widget/node_modules/.vite \
    --mount=type=cache,target=/root/.npm \
    npm run build

FROM node:26-alpine AS admin-builder
WORKDIR /app

COPY ./admin/package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --prefer-offline --no-audit --fund=false

COPY ./admin/ .
ARG VITE_NODE_ENV=production
ARG VITE_ADMIN_API_URL=/api/administrador
ARG VITE_WEB_URL
ARG VITE_VINE_ENABLED=false
ARG VITE_APP_ENV
ARG VITE_CARTO_API_KEY=
ENV VITE_NODE_ENV=$VITE_NODE_ENV
ENV VITE_ADMIN_API_URL=$VITE_ADMIN_API_URL
ENV VITE_WEB_URL=$VITE_WEB_URL
ENV VITE_VINE_ENABLED=$VITE_VINE_ENABLED
ENV VITE_APP_ENV=$VITE_APP_ENV
ENV VITE_CARTO_API_KEY=$VITE_CARTO_API_KEY
RUN --mount=type=cache,target=/app/node_modules/.vite \
    --mount=type=cache,target=/root/.npm \
    npm run build

FROM nginx:1.30.4-alpine
RUN rm -f /etc/nginx/conf.d/default.conf
COPY ./nginx/nginx.conf /etc/nginx/nginx.conf
COPY ./nginx/conf.d/mariachi.conf /etc/nginx/conf.d/mariachi.conf
COPY ./nginx/includes/ /etc/nginx/includes/
COPY ./nginx/templates/ /etc/nginx/templates/
COPY --from=admin-builder /app/dist /usr/share/nginx/html/mariachi
COPY --from=widget-builder /widget/dist /usr/share/nginx/html/colibri-widget
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
