import { env, pipeline } from "@huggingface/transformers";

env.allowLocalModels = false;
env.allowRemoteModels = true;

type FeatureExtractor = (
text: string,
options: {
pooling: "mean";
normalize: boolean;
},
) => Promise<{
data: Float32Array | Float64Array | ArrayLike<number>;
}>;

const EMBEDDING_MODEL = "Xenova/all-MiniLM-L6-v2";
export const EMBEDDING_DIMENSION = 384;

let extractorPromise: Promise<FeatureExtractor> | null = null;

async function getExtractor(): Promise<FeatureExtractor> {
if (!extractorPromise) {
extractorPromise = pipeline(
"feature-extraction",
EMBEDDING_MODEL,
) as Promise<FeatureExtractor>;
}

return extractorPromise;
}

export async function embedText(text: string): Promise<number[]> {
const cleanedText = text.trim();

if (!cleanedText) {
throw new Error("Cannot create an embedding from empty text.");
}

const extractor = await getExtractor();

const output = await extractor(cleanedText, {
pooling: "mean",
normalize: true,
});

const embedding = Array.from(output.data, Number);

if (embedding.length !== EMBEDDING_DIMENSION) {
throw new Error(
`Unexpected embedding dimension: ${embedding.length}. Expected ${EMBEDDING_DIMENSION}.,`
);
}

if (
!embedding.every(
(value) => typeof value === "number" && Number.isFinite(value),
)
) {
throw new Error("Embedding contains invalid numeric values.");
}

return embedding;
}