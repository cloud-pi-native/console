FROM alpine

RUN apk add --update git && mkdir /opt/share
COPY clone.sh /
RUN chmod +x /clone.sh

CMD /clone.sh
