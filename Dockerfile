# syntax=docker/dockerfile:1
FROM node:20-slim
WORKDIR /app

# OpenSSL is nodig voor Prisma's query-engine op Debian-gebaseerde images
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

RUN npx prisma generate
RUN npm run build

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Draait bewust niet als root binnen de container — een extra
# veiligheidslaag, los van de root/cees-scheiding op de VM zelf.
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
RUN chown -R nextjs:nodejs /app

COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

USER nextjs
EXPOSE 3000

# De entrypoint werkt bij elke (her)start eerst de database bij (schema +
# standaardwaarden) voordat de app zelf start — zo is "Portainer herbouwt
# en herstart de stack" voortaan echt de enige handeling die nodig is,
# zonder een los SSH-commando ervoor of erna.
ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["npm", "start"]
