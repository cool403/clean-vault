FROM nginx:stable-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY release/web/ /usr/share/nginx/html/
EXPOSE 80
