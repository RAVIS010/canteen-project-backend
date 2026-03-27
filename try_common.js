const { MongoClient } = require('mongodb');

async function test(uri, label) {
    const client = new MongoClient(uri, { serverSelectionTimeoutMS: 2000 });
    try {
        await client.connect();
        console.log(`✅ [${label}] SUCCESS!`);
        return true;
    } catch (err) {
        console.log(`❌ [${label}] FAILED: ${err.message}`);
        return false;
    } finally {
        await client.close();
    }
}

async function run() {
    const base = "cluster0.y3mns.mongodb.net/CMS_Database";
    const variants = [
        { u: "ravisj213", p: "ravisj213", l: "Original" },
        { u: "ravisj213", p: "admin123", l: "Admin123" },
        { u: "ravisj213", p: "cms2026", l: "cms2026" },
        { u: "admin", p: "admin123", l: "Admin/Admin123" },
        { u: "ravisj213", p: "ravis@123", l: "ravis@123" }
    ];

    for (const v of variants) {
        const uri = `mongodb+srv://${v.u}:${encodeURIComponent(v.p)}@${base}`;
        if (await test(uri, v.l)) break;
    }
}
run();
