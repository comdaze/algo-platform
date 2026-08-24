FROM grafana/grafana-oss:10.2.0
USER root
RUN grafana-cli plugins install grafana-athena-datasource
COPY provisioning/ /etc/grafana/provisioning/
COPY dashboards/ /var/lib/grafana/dashboards/
USER grafana
EXPOSE 3000
