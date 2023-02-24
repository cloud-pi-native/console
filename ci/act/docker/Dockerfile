# FROM ubuntu-latest
FROM docker.io/ubuntu:22.04

# Set system env
ENV DEBIAN_FRONTEND=noninteractive

WORKDIR /app

# Install packages
RUN apt-get update -y \
  && apt-get install -y \
  ssh \
  lsb-release \
  gnupg \
  gawk \
  libcurl3-gnutls \
  libcurl4 \
  curl \
  git \
  wget \
  sudo \
  gnupg-agent \
  ca-certificates \
  software-properties-common \
  apt-transport-https \
  libyaml-0-2 \
  zstd \
  zip \
  unzip \
  xz-utils \
  psmisc \
  libgtk2.0-0 \
  libgtk-3-0 \
  libgbm-dev \
  libnotify-dev \
  libgconf-2-4 \
  libnss3 \
  libxss1 \
  libasound2 \
  libxtst6 \
  xauth \
  xvfb \
  jq \
  gettext

# Install docker
RUN curl -fsSL https://get.docker.com -o get-docker.sh \
  && sudo sh get-docker.sh \
  && apt-get install -y \
  docker-compose-plugin

# Install nodejs
RUN apt-get install -y \
  software-properties-common \
  gcc \
  g++ \
  make \
  && curl -sL https://deb.nodesource.com/setup_lts.x | sudo -E bash - \
  && apt-get install -y \
  nodejs \
  build-essential
