const { createClient } = require('redis');
const { query } = require('../db');

const REDIS_URL = process.env.REDIS_URL;

async function syncSuricataRules() {
  try {
    const client = createClient({ url: REDIS_URL });
    await client.connect();

    const { rows } = await query('SELECT * FROM suricata_rules WHERE is_deleted = false');

    const rulesContent = rows.map(r => {
      return `${r.action} ${r.protocol} ${r.src_ip} ${r.src_port} -> ${r.dst_ip} ${r.dst_port} (msg:"${r.msg}"; sid:${r.sid}; rev:1;)`;
    }).join('\n');

    await client.set('suricata:rules:payload', rulesContent);

    await client.lPush('suricata:commands', 'reload');

    await client.disconnect();
  } catch (error) {
    console.error('Ошибка при синхронизации правил через Redis:', error);
  }
}

async function initSuricataRedisMonitor() {
  const client = createClient({ url: REDIS_URL });
  client.on('error', (err) => console.error('Redis Client Error', err));
  await client.connect();

  console.log('Подключено к Redis для мониторинга алертов');

  while (true) {
    try {
      const result = await client.blPop('suricata_eve', 0);
      if (!result) continue;

      const logEntry = JSON.parse(result.element);
      if (logEntry.event_type !== 'alert' || !logEntry.alert) continue;

      const { signature, severity } = logEntry.alert;
      const srcIp = logEntry.src_ip || '127.0.0.1';
      const dstPort = logEntry.dest_port || 'unknown';

      let mappedSeverity = 'medium';
      if (severity === 1) mappedSeverity = 'critical';
      else if (severity === 2) mappedSeverity = 'high';
      else if (severity >= 3) mappedSeverity = 'low';

      await query(
        `INSERT INTO incidents (source, boiler_id, severity, description, status)
         VALUES ($1, $2, $3, $4, 'open')`,
        ['suricata', null, mappedSeverity, `${srcIp} -> ${dstPort} [${signature}]`]
      );
    } catch (error) {
      console.warn('Ошибка цикла Redis:', error.message);
    }
  }
}

module.exports = { syncSuricataRules, initSuricataRedisMonitor };