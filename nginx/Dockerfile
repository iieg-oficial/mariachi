FROM node:24-alpine AS admin-builder
WORKDIR /app
COPY ./admin/package*.json ./
RUN npm ci
COPY ./admin/ .
ARG VITE_NODE_ENV=production
ARG VITE_ADMIN_API_URL=/api/administrador
ARG VITE_WEB_URL
ARG VITE_SENTRY_DSN
ARG SENTRY_AUTH_TOKEN
ARG SENTRY_ORG
ARG SENTRY_PROJECT
ENV VITE_NODE_ENV=$VITE_NODE_ENV
ENV VITE_ADMIN_API_URL=$VITE_ADMIN_API_URL
ENV VITE_WEB_URL=$VITE_WEB_URL
ENV VITE_SENTRY_DSN=$VITE_SENTRY_DSN
ENV SENTRY_AUTH_TOKEN=$SENTRY_AUTH_TOKEN
ENV SENTRY_ORG=$SENTRY_ORG
ENV SENTRY_PROJECT=$SENTRY_PROJECT
RUN npm run build

FROM nginx:alpine
RUN rm -f /etc/nginx/conf.d/default.conf
COPY ./nginx/nginx.conf /etc/nginx/nginx.conf
COPY ./nginx/conf.d/mariachi.conf /etc/nginx/conf.d/mariachi.conf
COPY --from=admin-builder /app/dist /usr/share/nginx/html/mariachi
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
