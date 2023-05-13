upstream api {
  server $SERVER;
}

server {
  listen 8080;
  server_name localhost;
  root /opt/bitnami/nginx/html;
  index index.html;

  large_client_header_buffers 4 32k;

  location / {
    try_files $uri $uri/ @rewrites;
  }

  location @rewrites {
    rewrite "^(.+)$" /index.html last;
  }

  location /api {
    rewrite "^(.*)$" $1 break;
    add_header Access-Control-Allow-Origin '$http_origin';
    proxy_pass http://api;
    proxy_redirect off;
    proxy_buffering off;
    proxy_http_version 1.1;

    # For WebSockets
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  }
}
