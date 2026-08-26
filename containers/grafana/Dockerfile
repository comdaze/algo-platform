# China mirror: Docker Hub is unreachable in the China regions, so pull the
# Grafana base image through the DaoCloud Docker Hub mirror.
# 10.4.3 (not 10.2.0): 10.2.0 has an anonymous-RBAC regression where anonymous
# users get empty permissions and are 403'd on dashboards:read, which breaks the
# embedded (anonymous) dashboard. 10.4.x resolves anonymous Viewer permissions.
FROM docker.m.daocloud.io/grafana/grafana-oss:10.4.3
USER root
# The Athena datasource plugin is fetched from grafana.com, which may be slow or
# blocked from the China regions. Keep it best-effort so the image still builds;
# if it did not install, add it later via GF_INSTALL_PLUGINS or a mirrored .zip.
RUN grafana-cli plugins install grafana-athena-datasource || echo "WARN: grafana-athena-datasource install failed (network); continuing without it"
COPY provisioning/ /etc/grafana/provisioning/
COPY dashboards/ /var/lib/grafana/dashboards/
USER grafana
EXPOSE 3000
