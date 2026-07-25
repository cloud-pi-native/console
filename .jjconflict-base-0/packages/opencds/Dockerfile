FROM node:24-alpine AS prod

RUN npm install -g @mockoon/cli@9.3.0

# Install curl for healthcheck and tzdata for timezone support.
RUN apk --no-cache add curl tzdata

# Do not run as root.
RUN adduser --shell /bin/sh --disabled-password --gecos "" mockoon

COPY packages/opencds/opencds_api.json ./opencds_api.json
RUN chown -R mockoon ./opencds_api.json

USER mockoon

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3100/api/v1/health || exit 1

EXPOSE 3100

ENTRYPOINT ["mockoon-cli","start","--disable-log-to-file","--data","./opencds_api.json","--port","3100"]
