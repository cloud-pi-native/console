FROM docker.io/postgres:14.5-bullseye

# Create the needed temp file before the first postgreSQL execution

RUN mkdir temp

# Set user rights to allow the on-root-postgres-user 
# to access the temp folder

RUN chown -R postgres:postgres /temp /var/lib/postgresql/data /var/run/postgresql
RUN chmod 777 /temp /var/lib/postgresql/data /var/run/postgresql

# Change to non-root privilege

USER postgres