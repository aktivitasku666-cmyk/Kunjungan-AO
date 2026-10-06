const express = require("express");
const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");
const multer = require("multer");
const XLSX = require("xlsx");

const app = express();
const PORT = process.env.PORT || 3000;
const OWNER_KEY = process.env.OWNER_KEY || "OWNER-2026";

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, "uploads");
fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, "visit-ao.sqlite"));
db.pragma("journal_mode = WAL");
db.exec(`
CREATE TABLE IF NOT EXISTS visits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  visit_id TEXT UNIQUE NOT NULL,
  ao_id TEXT NOT NULL,
  ao_name TEXT NOT NULL,
  branch TEXT NOT NULL,
  visit_date TEXT NOT NULL,
  visit_time TEXT,
  purpose TEXT,
  debtor_name TEXT NOT NULL,
  debtor_address TEXT,
  debtor_position TEXT,
  nik TEXT,
  institution TEXT,
  institution_type TEXT,
  need TEXT,
  potential TEXT,
  product TEXT,
  funds TEXT,
  visit_status TEXT,
  interest TEXT,
  follow_up TEXT,
  follow_up_date TEXT,
  notes TEXT,
  latitude REAL,
  longitude REAL,
  maps_url TEXT,
  booking_status TEXT NOT NULL DEFAULT 'Belum ditentukan',
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS photos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  visit_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  original_name TEXT,
  mime_type TEXT
);
`);

const AOS = [
  ["AO001","Andi Pratama","Bandung Dago"],
  ["AO002","Budi Santoso","Bandung Asia Afrika"],
  ["AO003","Citra Lestari","Cimahi"],
  ["AO004","Dewi Anggraini","Sumedang"],
  ["AO005","Eko Wijaya","Garut"],
  ["AO006","Fajar Nugroho","Tasikmalaya"],
  ["AO007","Gita Maharani","Cirebon"],
  ["AO008","Hendra Kurniawan","Karawang"],
  ["AO009","Intan Permata","Bekasi"],
  ["AO010","Joko Firmansyah","Bogor"],
  ["AO011","Kartika Sari","Sukabumi"],
  ["AO012","Lukman Hakim","Purwakarta"]
];

const INSTITUTIONS = [
  "Pemerintah Provinsi Jawa Barat","Pemerintah Kota Bandung","Pemerintah Kabupaten Bandung",
  "Pemerintah Kabupaten Sumedang","Pemerintah Kabupaten Garut","Pemerintah Kabupaten Tasikmalaya",
  "Pemerintah Kota Cimahi","Pemerintah Kabupaten Cirebon","Pemerintah Kabupaten Karawang",
  "Pemerintah Kota Bekasi","Pemerintah Kota Bogor","Pemerintah Kabupaten Sukabumi",
  "Kementerian Pendidikan Dasar dan Menengah","Kementerian Agama","Kementerian Kesehatan",
  "Kementerian Keuangan","Kementerian Dalam Negeri","Kepolisian Negara Republik Indonesia",
  "Tentara Nasional Indonesia","Badan Kepegawaian Negara","Badan Pusat Statistik"
];

const upload = multer({
  storage: multer.diskStorage({
    destination: (_, __, cb) => cb(null, UPLOAD_DIR),
    filename: (_, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
    }
  }),
  limits: { files: 3, fileSize: 5 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    if (!["image/jpeg","image/png"].includes(file.mimetype)) return cb(new Error("Foto harus JPG/PNG."));
    cb(null, true);
  }
});

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(UPLOAD_DIR));
app.use(express.static(path.join(__dirname, "public")));

function nextVisitId() {
  const row = db.prepare("SELECT COUNT(*) AS c FROM visits").get();
  return `VIS-${new Date().getFullYear()}-${String(row.c + 1).padStart(6,"0")}`;
}
function maskNik(nik) {
  if (!nik) return "-";
  const d = String(nik).replace(/\D/g, "");
  if (d.length < 6) return "••••••";
  return `${d.slice(0,2)}********${d.slice(-4)}`;
}
function normalize(v) { return v == null ? "" : String(v).trim(); }

app.get("/health", (req,res) => res.json({ ok: true, service: "visit-ao" }));

app.get("/api/bootstrap", (req,res) => res.json({ aos: AOS, institutions: INSTITUTIONS }));

app.get("/api/visits", (req,res) => {
  const aoId = normalize(req.query.aoId);
  if (!aoId) return res.status(400).json({error:"aoId wajib"});
  const q = normalize(req.query.q);
  let rows = db.prepare(`
    SELECT v.*, (SELECT COUNT(*) FROM photos p WHERE p.visit_id=v.visit_id) AS photo_count
    FROM visits v WHERE v.ao_id=? ORDER BY v.created_at DESC
  `).all(aoId);
  if (q) {
    const x = q.toLowerCase();
    rows = rows.filter(r => [r.visit_id,r.debtor_name,r.institution,r.product,r.visit_status,r.booking_status]
      .some(v => String(v||"").toLowerCase().includes(x)));
  }
  rows = rows.map(r => ({...r, nik_masked: maskNik(r.nik), nik: undefined}));
  res.json(rows);
});

app.get("/api/visits/:visitId", (req,res) => {
  const v = db.prepare("SELECT * FROM visits WHERE visit_id=?").get(req.params.visitId);
  if (!v) return res.status(404).json({error:"Kunjungan tidak ditemukan"});
  const photos = db.prepare("SELECT filename, original_name FROM photos WHERE visit_id=? ORDER BY id").all(v.visit_id);
  res.json({...v, nik_masked: maskNik(v.nik), nik: undefined, photos});
});

app.get("/api/dashboard/:aoId", (req,res) => {
  const aoId = req.params.aoId;
  const total = db.prepare("SELECT COUNT(*) c FROM visits WHERE ao_id=?").get(aoId).c;
  const month = new Date().toISOString().slice(0,7);
  const monthCount = db.prepare("SELECT COUNT(*) c FROM visits WHERE ao_id=? AND substr(visit_date,1,7)=?").get(aoId,month).c;
  const success = db.prepare("SELECT COUNT(*) c FROM visits WHERE ao_id=? AND booking_status='Berhasil booking'").get(aoId).c;
  const fail = db.prepare("SELECT COUNT(*) c FROM visits WHERE ao_id=? AND booking_status='Tidak berhasil booking'").get(aoId).c;
  const latest = db.prepare("SELECT visit_id,visit_date,debtor_name,institution,product,visit_status,booking_status FROM visits WHERE ao_id=? ORDER BY created_at DESC LIMIT 8").all(aoId);
  res.json({total,month:monthCount,success,fail,latest});
});

app.post("/api/visits", upload.array("photos",3), (req,res) => {
  try {
    const b = req.body;
    const required = ["ao_id","ao_name","branch","visit_date","debtor_name","institution","product","visit_status","interest","follow_up"];
    for (const key of required) {
      if (!normalize(b[key])) return res.status(400).json({error:`Field ${key} wajib diisi.`});
    }
    if (!req.files || req.files.length < 1) return res.status(400).json({error:"Minimal 1 foto kunjungan wajib diunggah."});
    if (!normalize(b.latitude) || !normalize(b.longitude)) return res.status(400).json({error:"Lokasi GPS wajib diizinkan dan direkam."});

    const visitId = nextVisitId();
    const created = new Date().toISOString();
    const maps = `https://www.google.com/maps?q=${encodeURIComponent(b.latitude)},${encodeURIComponent(b.longitude)}`;
    const insert = db.prepare(`
      INSERT INTO visits (
        visit_id,ao_id,ao_name,branch,visit_date,visit_time,purpose,debtor_name,debtor_address,
        debtor_position,nik,institution,institution_type,need,potential,product,funds,visit_status,
        interest,follow_up,follow_up_date,notes,latitude,longitude,maps_url,booking_status,created_at
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `);
    insert.run(
      visitId,b.ao_id,b.ao_name,b.branch,normalize(b.visit_date),normalize(b.visit_time),normalize(b.purpose),
      normalize(b.debtor_name),normalize(b.debtor_address),normalize(b.debtor_position),normalize(b.nik),
      normalize(b.institution),normalize(b.institution_type),normalize(b.need),normalize(b.potential),
      normalize(b.product),normalize(b.funds),normalize(b.visit_status),normalize(b.interest),
      normalize(b.follow_up),normalize(b.follow_up_date),normalize(b.notes),Number(b.latitude),
      Number(b.longitude),maps,"Belum ditentukan",created
    );
    const insPhoto = db.prepare("INSERT INTO photos (visit_id,filename,original_name,mime_type) VALUES (?,?,?,?)");
    const tx = db.transaction(files => files.forEach(f => insPhoto.run(visitId,f.filename,f.originalname,f.mimetype)));
    tx(req.files);
    res.json({ok:true,visit_id:visitId,status:"Submitted",created_at:created});
  } catch(e) {
    console.error(e);
    res.status(500).json({error:e.message || "Gagal menyimpan data."});
  }
});

app.patch("/api/visits/:visitId/booking", (req,res) => {
  const status = normalize(req.body.status);
  if (!["Berhasil booking","Tidak berhasil booking"].includes(status))
    return res.status(400).json({error:"Status booking tidak valid."});
  const info = db.prepare("UPDATE visits SET booking_status=? WHERE visit_id=?").run(status,req.params.visitId);
  if (!info.changes) return res.status(404).json({error:"Kunjungan tidak ditemukan."});
  res.json({ok:true,status});
});

function exportWorkbook(rows, filename, res) {
  const data = rows.map(r => ({
    "Visit ID":r.visit_id, "Tanggal":r.visit_date, "AO":r.ao_name, "Cabang":r.branch,
    "Nama Calon Debitur":r.debtor_name, "NIK Masking":maskNik(r.nik), "Dinas":r.institution,
    "Jabatan":r.debtor_position, "HP":r.phone || "", "Produk":r.product, "Dana":r.funds,
    "Potensi":r.potential, "Status Kunjungan":r.visit_status, "Follow-up":r.follow_up,
    "Status Booking":r.booking_status, "Lokasi":`${r.latitude}, ${r.longitude}`, "Link Google Maps":r.maps_url
  }));
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(wb,ws,"Visit AO");
  const out = XLSX.write(wb,{bookType:"xlsx",type:"buffer"});
  res.setHeader("Content-Type","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition",`attachment; filename="${filename}"`);
  res.send(out);
}
app.get("/api/export/ao/:aoId", (req,res) => {
  const rows = db.prepare("SELECT * FROM visits WHERE ao_id=? ORDER BY created_at DESC").all(req.params.aoId);
  exportWorkbook(rows,`Visit-AO-${req.params.aoId}.xlsx`,res);
});
app.get("/api/export/all", (req,res) => {
  const rows = db.prepare("SELECT * FROM visits ORDER BY created_at DESC").all();
  exportWorkbook(rows,"Visit-AO-SEMUA.xlsx",res);
});

app.post("/api/reset", (req,res) => {
  if (normalize(req.body.ownerKey) !== OWNER_KEY || normalize(req.body.confirmation) !== "RESET")
    return res.status(403).json({error:"Akses reset ditolak. Kunci pemilik atau konfirmasi RESET salah."});
  db.exec("DELETE FROM photos; DELETE FROM visits;");
  for (const f of fs.readdirSync(UPLOAD_DIR)) fs.unlinkSync(path.join(UPLOAD_DIR,f));
  res.json({ok:true});
});

app.use((err,req,res,next) => {
  console.error(err);
  res.status(400).json({error:err.message || "Request tidak valid."});
});

app.listen(PORT, () => console.log(`Visit AO berjalan di http://localhost:${PORT}`));
