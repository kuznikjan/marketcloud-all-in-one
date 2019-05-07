FROM rabbitmq:3.7-management

ARG RABBITMQ_DEFAULT_USER=${RABBITMQ_DEFAULT_USER}
ARG RABBITMQ_DEFAULT_PASS=${RABBITMQ_DEFAULT_PASS}
ARG RABBITMQ_DEFAULT_VHOST=${RABBITMQ_DEFAULT_VHOST}

COPY ./init.sh /etc/rabbitmq/init.sh
RUN chmod +x /etc/rabbitmq/init.sh

ENTRYPOINT [ "/etc/rabbitmq/init.sh" ]