// All data lives here. To add a client, add one line to a list below.
// To add a new URL format, add one entry to logTypes (no other code changes).
// Path tokens: {client} lowercase id, {CLIENT} uppercase id, {date} dd-mm-yyyy,
// {ymd} yyyymmdd, {rep} rep code (uppercased).
window.LOG_CONFIG = {
  storages: {
    live: 'https://cirriusindiacentralstor.blob.core.windows.net',
    uat: 'https://storagegpworker.blob.core.windows.net',
    pre: 'https://storageaccountuat2.blob.core.windows.net',
    local: 'https://cirrdevstore.blob.core.windows.net',
    sunInt: 'https://blobstoragegm.blob.core.windows.net'
  },
  // Live clients whose iOS/Android logs sit in the sunInt storage. Links open without a "found?" check.
  sunIntClients: ['sunem1', 'sunem3'],
  // direct: open without checking the file exists first
  localEnvs: [
    { value: 'preENV', text: 'PRE ENV', storage: 'pre' },
    { value: 'local5.0', text: 'LOCAL 5.0', storage: 'local', direct: true },
    { value: 'storageGP', text: 'STORAGE GP / QC ENV', storage: 'uat' }
  ],
  // needs: fields that must be filled. sunInt: use sunInt storage for sunIntClients on Live.
  // localMap: fixed storage per local environment (default = the environment's own storage).
  logTypes: [
    { id: 'iosCp3', group: 'iOS', label: 'CP3 logs', needs: ['client', 'date', 'rep'], path: '{client}/cp3/images/txnsgp/devicelog/{date}/{rep}.txt' },
    { id: 'ios', group: 'iOS', label: 'CP2 logs', needs: ['client', 'date', 'rep'], sunInt: true, path: '{client}/images/txnsgp/devicelog/{date}/{rep}.txt' },
    { id: 'android', group: 'Android', label: 'Android logs', needs: ['client', 'date', 'rep'], sunInt: true, path: '{client}/images/txnsgp/devicelog/android/{date}/{rep}.txt' },
    { id: 'api', group: 'Server', label: 'API logs', needs: ['client', 'date', 'rep'], localMap: { preENV: 'pre', default: 'uat' }, path: 'apilogs/{CLIENT}/{rep}_{ymd}.txt' },
    { id: 'upw', group: 'Server', label: 'UPW logs', needs: ['client', 'date'], localMap: { preENV: 'pre', default: 'uat' }, path: 'apilogs/UPW/{CLIENT}_{ymd}_CommonLogs.txt' }
  ],
  // Live-only extras shown at the top of the Open logs card.
  all: { label: 'All live logs', needs: ['client', 'date', 'rep'], opens: ['ios', 'android', 'api'] },
  reportObject: { label: 'Data object', needs: ['client', 'date', 'rep'], path: '{client}/ReportObj/Success/{rep}' },
  clients: {
    live: [
      ["danone", "DANONE (danone)"],
      ["hul", "HUL (hul)"],
      ["sun", "SUN PHARMA (sun)"],
      ["cipla", "CIPLA (cipla)"],
      ["ajanta", "AJANTA PHARMA (ajanta)"],
      ["cipi", "CIPLA INTERNATIONAL (cipi)"],
      ["hulcp3", "HULCP3 (hulcp3)"],
      ["glenmark", "GLENMARK (glenmark)"],
      ["usv", "USV (usv)"],
      ["sunem2", "SUN EMERGING (sunem2)"],
      ["cadila", "CADILA (cadila)"],
      ["apl", "AUROBINDO (apl)"],
      ["drl", "DR. REDDY (drl)"],
      ["alcp2", "ALEMBIC (alcp2)"],
      ["jbcpl", "JBCPL (jbcpl)"],
      ["chc", "SUN CHC (chc)"],
      ["gmem", "GLEM (gmem)"],
      ["biotics", "BIOTICS (biotics)"],
      ["inzpera", "INZPERA HEALTH (inzpera)"],
      ["pghl", "PNG (pghl)"],
      ["arcp2", "ARISTO PHARMA (arcp2)"],
      ["aurogen", "AURO INDONESIA (aurogen)"],
      ["metr", "METROPOLIS (metr)"],
      ["sdpl", "SOFTDEAL PRIVATE (sdpl)"],
      ["bayer", "BAYER (bayer)"],
      ["higen", "HIGEN (higen)"],
      ["thyrocare", "THYROCARE (thyrocare)"],
      ["cadvet", "VETNOVA (cadvet)"],
      ["mega", "MEGACARE (mega)"],
      ["sunem1", "SUNRD (sunem1)"],
      ["sunem3", "SUN RUSSIA OTC (sunem3)"],
      ["cpc", "CPC DIAGNOSTIC (cpc)"],
      ["enbcl", "EMERCHEMIE (enbcl)"],
      ["zintl", "ZINTL (zintl)"],
      ["zydi", "ZYDUS (zydi)"],
      ["vapt", "VAPT (vapt)"],
      ["hem", "HEMAS (hem)"],
      ["eisai", "EISAI (eisai)"],
      ["elanco", "ELANCO (elanco)"],
      ["kenvue", "KENVUE (kenvue)"],
      ["medtech", "MEDTECH (medtech)"]
    ],
    local: [
      ["uat", "UAT (uat)"],
      ["ajantacp3", "AJANTACP3 (ajantacp3)"],
      ["uc3", "UC3 (uc3)"],
      ["uatsunem", "UATSUNEM (uatsunem)"],
      ["cp3dev", "CP3DEV (cp3dev)"],
      ["uatcp3", "UATCP3 (uatcp3)"],
      ["hulpre", "HULPRE (hulpre)"],
      ["hulcp3", "HULCP3 (hulcp3)"],
      ["suncp3", "SUNCP3 (suncp3)"],
      ["gmlo", "GMLO (gmlo)"],
      ["sunuat", "SUNUAT (sunuat)"],
      ["sunind", "SUNDEV (sunind)"],
      ["cipq", "CIPQ (cipq)"],
      ["jbcpl", "JBCPL LOCAL (jbcpl)"],
      ["usv", "USV LOCAL (usv)"],
      ["chcdev", "CHCDEV (chcdev)"],
      ["bayer", "BAYER LOCAL (bayer)"],
      ["almcp2", "ALEMBIC LOCAL (almcp2)"],
      ["gluat", "GLUAT (gluat)"],
      ["huluat", "HULUAT (huluat)"],
      ["ciplauat", "CIPLAUAT (ciplauat)"],
      ["chc1", "CHC1 (chc1)"],
      ["sunemuat", "SUNEMUAT (sunemuat)"],
      ["sunrdev", "SUNRDEV (sunrdev)"],
      ["ajdev", "AJDEV (ajdev)"],
      ["cp3", "CP3 (cp3)"],
      ["dcp3", "DCP3 (dcp3)"],
      ["cad", "CADILA LOCAL (cad)"],
      ["sunem3uat", "SUNEM3UAT (sunem3uat)"],
      ["uldev", "ULDEV (uldev)"],
      ["drlpre", "DRLPRE (drlpre)"],
      ["uathul", "UATHUL (uathul)"],
      ["uatdrl", "UATDRL (uatdrl)"],
      ["ciplapre", "CIPLAPRE (ciplapre)"],
      ["uatcipla", "UATCIPLA (uatcipla)"],
      ["uatjbcpl", "UATJBCPL (uatjbcpl)"],
      ["jbcplpre", "JBCPLPRE (jbcplpre)"],
      ["uatglmrk", "UATGLMRK (uatglmrk)"],
      ["glmrkpre", "GLMRKPRE (glmrkpre)"],
      ["ajantapre", "AJANTAPRE (ajantapre)"],
      ["uatajanta", "UATAJANTA (uatajanta)"],
      ["uatdanone", "UATDANONE (uatdanone)"],
      ["danonepre", "DANONEPRE (danonepre)"]
    ]
  }
};

// Native Logs page: the Node backend addresses (they call the log service) and the log types it understands.
// range: 'utc' = the day is sent as an IST-day start/end in UTC (like the web logs), 'date' = plain yyyy-mm-dd.
window.LOG_CONFIG.nativeLog = {
  api: {
    live: { search: 'https://nodenativelive.cirrius.in/api/v1/searchLog', module: 'https://nodenativelive.cirrius.in/api/v1/getModuleType' },
    local: { search: 'https://nodenativeapi.cirrius.in/api/v1/searchLog', module: 'https://nodenativeapi.cirrius.in/api/v1/getModuleType' }
  },
  types: [
    { value: 'web', label: 'web', range: 'utc' },
    { value: 'mobile_cp2', label: 'mobile_cp2', range: 'date' },
    { value: 'device_CP3', label: 'device_CP3', range: 'date' },
    { value: 'web_cp3', label: 'web_cp3', range: 'utc' }
  ],
  maxPages: 200
};
