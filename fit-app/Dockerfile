FROM node:22-alpine AS build
ARG VAPID_PUBLIC_KEY=""
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN if [ -n "$VAPID_PUBLIC_KEY" ]; then sed -i "s|vapidPublicKey: ''|vapidPublicKey: '$VAPID_PUBLIC_KEY'|" src/environments/environment.prod.ts; fi \
    && npm run build -- --configuration production --output-path=dist/fit-app

FROM nginx:1.27-alpine AS final
COPY --from=build /app/dist/fit-app/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1
