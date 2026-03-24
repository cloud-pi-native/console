FROM nginx:1.27-alpine as prod

# envsubst est inclus dans nginx:alpine via le paquet gettext
# On supprime la config par défaut
RUN rm /etc/nginx/conf.d/default.conf

# Config principale
COPY apps/nginx-strangler/nginx.conf /etc/nginx/nginx.conf

# Template de routing (sera substitué au démarrage)
COPY apps/nginx-strangler/conf.d/routing.conf /etc/nginx/templates/routing.conf.template

# Donner à l'utilisateur nginx les droits d'écriture sur conf.d/ (pour envsubst au démarrage)
# et sur les répertoires de logs/pid nécessaires en mode non-root
RUN chown -R nginx:nginx \
      /etc/nginx/nginx.conf \
      /etc/nginx/conf.d \
      /etc/nginx/templates \
      /etc/nginx/mime.types \
      /var/cache/nginx \
      /var/log/nginx \
    && touch /var/run/nginx.pid \
    && chown nginx:nginx /var/run/nginx.pid

USER nginx

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/health || exit 1

# Entrypoint : envsubst substitue les variables d'env dans les templates,
# puis démarre nginx en foreground
# Les variables substituées : LEGACY_UPSTREAM, NESTJS_UPSTREAM
CMD ["/bin/sh", "-c", \
  "envsubst '${LEGACY_UPSTREAM} ${NESTJS_UPSTREAM}' < /etc/nginx/templates/routing.conf.template > /etc/nginx/conf.d/routing.conf && nginx -t && nginx -g 'daemon off;'"]

EXPOSE 8080
