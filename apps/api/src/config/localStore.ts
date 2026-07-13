import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { env } from "./env";

/**
 * A zero-setup, zero-Docker persistence layer: one JSON file per "collection" under apps/api/data/db,
 * and uploaded files under apps/api/data/storage. Implements just the slice of the Firestore Admin SDK
 * surface repositories/* actually calls (doc/set/get/update/where/limit, FieldValue.arrayUnion) so those
 * files never had to change — this module is a drop-in replacement for the Firebase-backed original.
 * Swap this module out for a real database later without touching anything above repositories/.
 */
const DATA_DIR = path.resolve(__dirname, "../../data");
const DB_DIR = path.join(DATA_DIR, "db");
const STORAGE_DIR = path.join(DATA_DIR, "storage");

for (const dir of [DB_DIR, STORAGE_DIR]) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

type DocData = Record<string, unknown>;

const ARRAY_UNION = Symbol("arrayUnion");
interface ArrayUnionOp {
  [ARRAY_UNION]: true;
  values: unknown[];
}

export const FieldValue = {
  arrayUnion: (...values: unknown[]): ArrayUnionOp => ({ [ARRAY_UNION]: true, values }),
};

function isArrayUnion(value: unknown): value is ArrayUnionOp {
  return typeof value === "object" && value !== null && ARRAY_UNION in value;
}

function getPath(obj: DocData, segments: string[]): unknown {
  let cur: unknown = obj;
  for (const seg of segments) {
    if (cur === null || typeof cur !== "object") return undefined;
    cur = (cur as DocData)[seg];
  }
  return cur;
}

function setPath(obj: DocData, segments: string[], value: unknown): void {
  let cur = obj;
  for (let i = 0; i < segments.length - 1; i++) {
    const seg = segments[i];
    if (typeof cur[seg] !== "object" || cur[seg] === null) cur[seg] = {};
    cur = cur[seg] as DocData;
  }
  cur[segments[segments.length - 1]] = value;
}

/** Firestore-style partial update: dot-notation nested keys, plus FieldValue.arrayUnion sentinels. */
function applyUpdate(target: DocData, patch: DocData): DocData {
  const result: DocData = { ...target };
  for (const [key, value] of Object.entries(patch)) {
    const segments = key.split(".");
    if (isArrayUnion(value)) {
      const existingArray = (getPath(result, segments) as unknown[] | undefined) ?? [];
      const merged = [...existingArray];
      for (const v of value.values) {
        if (!merged.includes(v)) merged.push(v);
      }
      setPath(result, segments, merged);
    } else {
      setPath(result, segments, value);
    }
  }
  return result;
}

function collectionFile(name: string): string {
  return path.join(DB_DIR, `${name}.json`);
}

function loadCollection(name: string): Record<string, DocData> {
  const file = collectionFile(name);
  if (!existsSync(file)) return {};
  try {
    return JSON.parse(readFileSync(file, "utf-8"));
  } catch {
    return {};
  }
}

function saveCollection(name: string, data: Record<string, DocData>): void {
  writeFileSync(collectionFile(name), JSON.stringify(data, null, 2), "utf-8");
}

interface DocSnapshot {
  exists: boolean;
  id: string;
  data: () => unknown;
}

/**
 * `set`/`update` accept `unknown` (not `DocData`) and `data()` returns `unknown` — matching how the
 * real Firestore Admin SDK types this boundary, since callers pass concrete interfaces like `Ticket`
 * (no index signature) rather than plain `Record<string, unknown>` literals.
 */
class DocRef {
  constructor(
    private collectionName: string,
    public id: string
  ) {}

  async get(): Promise<DocSnapshot> {
    const collection = loadCollection(this.collectionName);
    const doc = collection[this.id];
    return { exists: doc !== undefined, id: this.id, data: () => doc };
  }

  async set(value: unknown): Promise<void> {
    const collection = loadCollection(this.collectionName);
    collection[this.id] = value as DocData;
    saveCollection(this.collectionName, collection);
  }

  async update(patch: unknown): Promise<void> {
    const collection = loadCollection(this.collectionName);
    const existing = collection[this.id];
    if (existing === undefined) {
      throw new Error(`No document to update: ${this.collectionName}/${this.id}`);
    }
    collection[this.id] = applyUpdate(existing, patch as DocData);
    saveCollection(this.collectionName, collection);
  }
}

type WhereOp = "==";
interface WhereClause {
  field: string;
  op: WhereOp;
  value: unknown;
}

class LocalQuery {
  private limitCount: number | null = null;

  constructor(
    private collectionName: string,
    private wheres: WhereClause[]
  ) {}

  where(field: string, op: WhereOp, value: unknown): LocalQuery {
    return new LocalQuery(this.collectionName, [...this.wheres, { field, op, value }]);
  }

  limit(n: number): LocalQuery {
    const next = new LocalQuery(this.collectionName, this.wheres);
    next.limitCount = n;
    return next;
  }

  async get(): Promise<{ docs: DocSnapshot[]; empty: boolean }> {
    const collection = loadCollection(this.collectionName);
    let entries = Object.entries(collection);
    for (const clause of this.wheres) {
      entries = entries.filter(([, doc]) => getPath(doc, clause.field.split(".")) === clause.value);
    }
    if (this.limitCount !== null) entries = entries.slice(0, this.limitCount);
    const docs = entries.map(([id, doc]) => ({ exists: true, id, data: () => doc }));
    return { docs, empty: docs.length === 0 };
  }
}

class CollectionRef {
  constructor(private name: string) {}

  doc(id?: string): DocRef {
    return new DocRef(this.name, id ?? randomUUID());
  }

  where(field: string, op: WhereOp, value: unknown): LocalQuery {
    return new LocalQuery(this.name, []).where(field, op, value);
  }

  async get(): Promise<{ docs: DocSnapshot[]; empty: boolean }> {
    return new LocalQuery(this.name, []).get();
  }
}

class LocalFirestore {
  collection(name: string): CollectionRef {
    return new CollectionRef(name);
  }
}

let dbInstance: LocalFirestore | undefined;
export function getDb(): LocalFirestore {
  if (!dbInstance) dbInstance = new LocalFirestore();
  return dbInstance;
}

interface LocalFile {
  save(buffer: Buffer, opts?: { metadata?: { contentType?: string } }): Promise<void>;
  getSignedUrl(opts: { action: "read"; expires: string }): Promise<[string]>;
}

class LocalBucket {
  file(filePath: string): LocalFile {
    const absPath = path.join(STORAGE_DIR, filePath);
    return {
      async save(buffer: Buffer) {
        mkdirSync(path.dirname(absPath), { recursive: true });
        writeFileSync(absPath, buffer);
      },
      async getSignedUrl() {
        return [`http://localhost:${env.port}/storage/${filePath}`];
      },
    };
  }
}

let bucketInstance: LocalBucket | undefined;
export function getBucket(): LocalBucket {
  if (!bucketInstance) bucketInstance = new LocalBucket();
  return bucketInstance;
}

export const STORAGE_PUBLIC_DIR = STORAGE_DIR;
