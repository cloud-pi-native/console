# FROM ubuntu-latest
FROM docker.io/ubuntu:22.04 AS build

# Set system env
ARG TARGETOS
ARG TARGETARCH
ENV DEBIAN_FRONTEND=noninteractive

# Install common packages
RUN apt-get update && apt-get install -y \
  apt-transport-https \
  ca-certificates \
  curl \
  gawk \
  gettext \
  git \
  gnupg \
  gnupg-agent \
  jq \
  libasound2 \
  libcurl3-gnutls \
  libcurl4 \
  libgbm-dev \
  libgconf-2-4 \
  libgtk2.0-0 \
  libgtk-3-0 \
  libnotify-dev \
  libnss3 \
  libxss1 \
  libxtst6 \
  libyaml-0-2 \
  lsb-release \
  psmisc \
  python3-pip \
  software-properties-common \
  ssh \
  sudo \
  unzip \
  wget \
  xauth \
  xvfb \
  xz-utils \
  zstd \
  zip

# Install docker
RUN sudo apt-get install -y ca-certificates curl gnupg \
  && sudo install -m 0755 -d /etc/apt/keyrings \
  && curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg \
  && sudo chmod a+r /etc/apt/keyrings/docker.gpg \
  && echo "deb [arch="$(dpkg --print-architecture)" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  "$(. /etc/os-release && echo "$VERSION_CODENAME")" stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null \
  && sudo apt-get update && sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Install nodejs
RUN apt-get install -y ca-certificates curl gnupg \
  && sudo mkdir -p /etc/apt/keyrings \
  && curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | sudo gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg \
  && echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_18.x nodistro main" | sudo tee /etc/apt/sources.list.d/nodesource.list \
  && apt-get update \
  && apt-get install -y nodejs

# Install ansible
RUN python3 -m pip install ansible

# Add wakemeops debian repo
RUN curl -sSL https://raw.githubusercontent.com/upciti/wakemeops/main/assets/install_repository | sudo bash \
  && sudo apt-get update && apt-get install -y \
  act \
  github-cli \
  golang-go \
  helm \
  helm-docs \
  k9s \
  kind \
  krew \
  kubectl \
  kubectx \
  kubens \
  kustomize \
  minio-client \
  rclone \
  scw \
  terraform \
  trivy \
  vault \
  yq
