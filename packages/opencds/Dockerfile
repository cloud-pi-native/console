FROM node:18-alpine

# Install mockoon-cli and dependencies.
RUN corepack install -g @mockoon/cli@9.3.0 && \
    apk --no-cache add curl tzdata && \
    adduser --shell /bin/sh --disabled-password --gecos "" mockoon

COPY ./opencds_api.json ./opencds_api.json
RUN chown -R mockoon ./opencds_api.json

USER mockoon

EXPOSE 3100

ENTRYPOINT ["mockoon-cli","start","--disable-log-to-file","--data","./opencds_api.json","--port","3100"]

# Usage: docker run -p <host_port>:3100 mockoon-test
