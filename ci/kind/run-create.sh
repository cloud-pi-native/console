if [ -z "$(kind get clusters | grep 'kind')" ]; then
  printf "\n\n${red}[kind wrapper].${no_color} Create Kind cluster\n\n"

  kind create cluster --config $SCRIPTPATH/configs/kind-config.yml


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