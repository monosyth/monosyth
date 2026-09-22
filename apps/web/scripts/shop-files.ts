import { readFile } from "node:fs/promises";
import { resolve, relative, isAbsolute } from "node:path";
import { createHash } from "node:crypto";
import { applicationDefault, initializeApp } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";
import { shopReleases, storagePath } from "../src/lib/shop/catalog";

async function main() {
  // Never copy paid files into public/ or this repository. Default is read-only.
  const args = process.argv.slice(2);
  const sourceRoot = args.find((arg) => arg.startsWith("--source="))?.slice(9);
  if (!sourceRoot) throw new Error("Pass --source=/absolute/path/to/SEWstudio. Add --upload only after configuring a private bucket.");
  const upload = args.includes("--upload");
  const prepared: { path: string; bytes: Buffer; name: string; sha256: string }[] = [];
  for (const product of shopReleases) {
    for (const file of product.files) {
      const source = resolve(sourceRoot, file.source);
      const inside = relative(resolve(sourceRoot), source);
      if (inside.startsWith("..") || isAbsolute(inside)) throw new Error("Source must be inside SEWstudio");
      const bytes = await readFile(source);
      if (bytes.length !== file.bytes || createHash("sha256").update(bytes).digest("hex") !== file.sha256) throw new Error(`Source edition changed: ${file.name}`);
      prepared.push({ path: storagePath(product, file), bytes, name: file.name, sha256: file.sha256 });
    }
  }
  console.log(`Verified ${prepared.length} exact customer files across ${shopReleases.length} pattern editions`);
  if (upload) {
    const bucketName = process.env.SHOP_STORAGE_BUCKET?.trim();
    if (!bucketName) throw new Error("Set SHOP_STORAGE_BUCKET before uploading");
    const app = initializeApp({ credential: applicationDefault() });
    const bucket = getStorage(app).bucket(bucketName);
    const [meta] = await bucket.getMetadata();
    if (meta.iamConfiguration?.publicAccessPrevention !== "enforced" || !meta.iamConfiguration?.uniformBucketLevelAccess?.enabled) throw new Error("Bucket must enforce public access prevention and uniform bucket-level access");
    for (const file of prepared) {
      const object = bucket.file(file.path);
      try {
        await object.save(file.bytes, {
          resumable: false, validation: "crc32c", preconditionOpts: { ifGenerationMatch: 0 },
          metadata: { contentType: file.name.endsWith(".pdf") ? "application/pdf" : "application/zip", cacheControl: "private, no-store", metadata: { sha256: file.sha256 } },
        });
      } catch (error) {
        if (!(error && typeof error === "object" && "code" in error && error.code === 412)) throw error;
        const [existingMeta] = await object.getMetadata();
        const [existingBytes] = await object.download();
        if (existingMeta.metadata?.firebaseStorageDownloadTokens || createHash("sha256").update(existingBytes).digest("hex") !== file.sha256) throw new Error(`Existing object failed verification: ${file.name}`);
      }
      console.log(`Ready: ${file.name}`);
    }
    console.log("Upload complete. No objects were made public.");
  } else {
    console.log("Read-only verification complete. No files were uploaded.");
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "File setup failed");
  process.exitCode = 1;
});
