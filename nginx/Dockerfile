FROM node:24-alpine AS web-builder
WORKDIR /app
COPY ./web/package*.json ./
RUN npm ci
COPY ./web/ .
ARG VITE_NODE_ENV=production
ARG VITE_GOOGLE_ANALYTICS_ID
ENV VITE_NODE_ENV=$VITE_NODE_ENV
ENV VITE_GOOGLE_ANALYTICS_ID=$VITE_GOOGLE_ANALYTICS_ID
RUN npm run build

FROM node:24-alpine AS admin-builder
WORKDIR /app
COPY ./admin/package*.json ./
RUN npm ci
COPY ./admin/ .
ARG VITE_NODE_ENV=production
ARG VITE_GOOGLE_ANALYTICS_ID
ENV VITE_NODE_ENV=$VITE_NODE_ENV
ENV VITE_GOOGLE_ANALYTICS_ID=$VITE_GOOGLE_ANALYTICS_ID
RUN npm run build

FROM nginx:alpine
COPY ./nginx/nginx.conf /etc/nginx/nginx.conf
COPY ./nginx/conf.d /etc/nginx/conf.d
COPY ./nginx/ssl /etc/nginx/ssl
COPY --from=web-builder /app/dist /usr/share/nginx/html
COPY --from=admin-builder /app/dist /usr/share/nginx/html/administrador
EXPOSE 80 443
CMD ["nginx", "-g", "daemon off;"]
