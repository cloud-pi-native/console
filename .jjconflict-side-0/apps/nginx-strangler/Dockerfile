FROM nginxinc/nginx-unprivileged:1.31-alpine AS prod

USER root

# On supprime la config par défaut
RUN rm /etc/nginx/conf.d/default.conf

# Config principale
COPY apps/nginx-strangler/nginx.conf /etc/nginx/nginx.conf

# Template de routing (sera substitué au démarrage)
COPY apps/nginx-strangler/conf.d/routing.conf /etc/nginx/templates/routing.conf.template

# Donner à l'utilisateur nginx et au groupe root les droits d'écriture sur conf.d/ (pour subst au démarrage)
# et sur les répertoires de logs/pid nécessaires en mode non-root
# OpenShift exécute les conteneurs avec un UID arbitraire appartenant au groupe root.
RUN chown -R nginx:root \
      /etc/nginx/nginx.conf \
      /etc/nginx/conf.d \
      /etc/nginx/templates \
      /etc/nginx/mime.types \
      /var/cache/nginx \
      /var/log/nginx \
    && touch /var/run/nginx.pid \
    && chown nginx:root /var/run/nginx.pid && chmod g+w /var/run/nginx.pid

USER nginx

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/health || exit 1

EXPOSE 8080
