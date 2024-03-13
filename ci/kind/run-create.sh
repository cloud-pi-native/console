if [ -z "$(kind get clusters | grep 'kind')" ]; then
  [[ -d "$SCRIPTPATH/configs/rendered" ]] || mkdir -p "$SCRIPTPATH/configs/rendered/"

  # Prepare kind config
  if [[ -f "$SCRIPTPATH/../../env/kind-values.yml" ]]; then
    KIND_CONFIG="$(helm template dev $SCRIPTPATH/configs/cluster \
      --values $SCRIPTPATH/../../env/kind-values.yml)"
    echo "$KIND_CONFIG" > $SCRIPTPATH/configs/rendered/kind-config.yml
  else
    KIND_CONFIG="$(helm template dev $SCRIPTPATH/configs/cluster)"
    echo "$KIND_CONFIG" > $SCRIPTPATH/configs/rendered/kind-config.yml
  fi

  printf "\n\n${red}[kind wrapper].${no_color} Create Kind cluster\n\n"

  kind create cluster --config $SCRIPTPATH/configs/rendered/kind-config.yml

  printf "\n\n${red}[kind wrapper].${no_color} Install Traefik ingress controller\n\n"

  helm --kube-context kind-kind repo add traefik https://traefik.github.io/charts && helm repo update
  helm --kube-context kind-kind upgrade \
    --install \
    --wait \
    --namespace traefik \
    --create-namespace \
    --values $SCRIPTPATH/configs/traefik-values.yml \
    traefik traefik/traefik
fi
