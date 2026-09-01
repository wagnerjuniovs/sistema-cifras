import { randomUUID } from "node:crypto";

const API_KEY = "AIzaSyCQxdgZfXUpczb6fW4ngRV9WebWWJLAEcM";
const PROJECT_ID = "cifras-a7ad7";
const authBase = "https://identitytoolkit.googleapis.com/v1";
const firestoreBase = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

const email = `smoke-${Date.now()}-${randomUUID().slice(0, 8)}@example.com`;
const password = `Teste!${randomUUID().replaceAll("-", "").slice(0, 18)}a1`;
let idToken = "";
let uid = "";
const createdDocuments = [];

async function request(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${JSON.stringify(payload)}`);
  }

  return payload;
}

function field(value) {
  if (value === null) {
    return { nullValue: null };
  }

  if (value instanceof Date) {
    return { timestampValue: value.toISOString() };
  }

  return { stringValue: String(value) };
}

async function authRequest(endpoint, body) {
  return request(`${authBase}/${endpoint}?key=${API_KEY}`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

async function firestoreRequest(path, options = {}) {
  return request(`${firestoreBase}/${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${idToken}`,
      ...(options.headers ?? {}),
    },
  });
}

async function createDocument(collectionPath, documentId, fields) {
  const path = `${collectionPath}?documentId=${documentId}`;
  const document = await firestoreRequest(path, {
    method: "POST",
    body: JSON.stringify({
      fields,
    }),
  });
  createdDocuments.push(`${collectionPath}/${documentId}`);
  return document;
}

async function patchDocument(documentPath, fields) {
  const masks = Object.keys(fields)
    .map((name) => `updateMask.fieldPaths=${encodeURIComponent(name)}`)
    .join("&");

  return firestoreRequest(`${documentPath}?${masks}`, {
    method: "PATCH",
    body: JSON.stringify({ fields }),
  });
}

async function deleteCreatedDocuments() {
  for (const documentPath of createdDocuments.reverse()) {
    try {
      await firestoreRequest(documentPath, { method: "DELETE" });
    } catch (error) {
      console.warn(`Falha ao remover ${documentPath}: ${error.message}`);
    }
  }
}

async function deleteAccount() {
  if (!idToken) {
    return;
  }

  await authRequest("accounts:delete", { idToken });
}

async function verifyCollectionEmpty(collectionPath) {
  const payload = await firestoreRequest(collectionPath);
  const count = (payload.documents ?? []).length;

  if (count !== 0) {
    throw new Error(`A coleção ${collectionPath} ainda possui ${count} documento(s).`);
  }
}

async function verifyAccountDeleted() {
  try {
    await authRequest("accounts:signInWithPassword", {
      email,
      password,
      returnSecureToken: true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (
      message.includes("EMAIL_NOT_FOUND") ||
      message.includes("INVALID_LOGIN_CREDENTIALS") ||
      message.includes("INVALID_PASSWORD")
    ) {
      return;
    }

    throw error;
  }

  throw new Error("A conta temporária ainda autentica após a exclusão.");
}

async function run() {
  console.log("Criando usuário temporário no Firebase Authentication...");
  const auth = await authRequest("accounts:signUp", {
    email,
    password,
    returnSecureToken: true,
  });
  idToken = auth.idToken;
  uid = auth.localId;
  console.log(`Conta temporária criada e autenticada: ${uid}`);

  const now = new Date();
  const folderId = `pasta-${Date.now()}`;
  const subfolderId = `subpasta-${Date.now()}`;
  const songId = `cifra-${Date.now()}`;

  console.log("Criando pasta no Firestore...");
  await createDocument(`users/${uid}/folders`, folderId, {
    name: field("Sertanejo"),
    parentId: field(null),
    createdAt: field(now),
    updatedAt: field(now),
  });
  console.log("Pasta criada.");

  console.log("Criando subpasta no Firestore...");
  await createDocument(`users/${uid}/folders`, subfolderId, {
    name: field("Zezé Di Camargo e Luciano"),
    parentId: field(folderId),
    createdAt: field(now),
    updatedAt: field(now),
  });
  console.log("Subpasta criada.");

  console.log("Criando cifra no Firestore...");
  await createDocument(`users/${uid}/songs`, songId, {
    title: field("É o Amor"),
    artist: field("Zezé Di Camargo e Luciano"),
    content: field("Intro: C G Am F\n\nC              G\nEu não vou negar"),
    folderId: field(folderId),
    createdAt: field(now),
    updatedAt: field(now),
  });
  console.log("Cifra criada.");

  console.log("Movendo cifra para a subpasta...");
  await patchDocument(`users/${uid}/songs/${songId}`, {
    folderId: field(subfolderId),
    updatedAt: field(new Date()),
  });
  console.log("Cifra movida.");

  console.log("Lendo pasta, subpasta e cifra...");
  const songs = await firestoreRequest(`users/${uid}/songs`);
  const folders = await firestoreRequest(`users/${uid}/folders`);

  if ((songs.documents ?? []).length !== 1 || (folders.documents ?? []).length !== 2) {
    throw new Error("A leitura de documentos não retornou os itens esperados.");
  }

  const movedSong = (songs.documents ?? []).find((document) => document.name.endsWith(`/${songId}`));

  if (movedSong?.fields?.folderId?.stringValue !== subfolderId) {
    throw new Error("A cifra lida não está na subpasta esperada após a movimentação.");
  }

  console.log("Leitura confirmada.");

  console.log("Smoke Firebase concluído com sucesso.");
}

try {
  await run();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes("CONFIGURATION_NOT_FOUND")) {
    console.error(
      "Firebase respondeu CONFIGURATION_NOT_FOUND. Ative o Firebase Authentication/Email Password e confirme se o projeto cifras-a7ad7 está disponível para esta chave.",
    );
  } else if (message.includes("SERVICE_DISABLED") || message.includes("firestore.googleapis.com")) {
    console.error(
      "Firebase respondeu SERVICE_DISABLED para o Cloud Firestore. O projeto cifras-a7ad7 ainda precisa ter o Cloud Firestore criado/ativado no painel Google/Firebase antes de aceitar leituras e gravações.",
    );
  } else {
    console.error(message);
  }

  process.exitCode = 1;
} finally {
  console.log("Removendo dados temporários...");
  await deleteCreatedDocuments();
  if (idToken && uid) {
    await verifyCollectionEmpty(`users/${uid}/songs`);
    await verifyCollectionEmpty(`users/${uid}/folders`);
    console.log("Dados temporários removidos e verificados.");
  }
  await deleteAccount();
  if (idToken) {
    await verifyAccountDeleted();
    console.log("Conta temporária excluída e verificada.");
  }
}
