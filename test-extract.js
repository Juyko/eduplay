import { extractQuestions } from './src/utils/questionExtractor.js';
import fs from 'fs';

const testJSON = `[
  {
    "question": "Aşağıdaki grafiğe göre en çok satılan ürün hangisidir?",
    "options": ["Elma", "Armut", "Muz", "Çilek"],
    "answer": "Muz",
    "type": "MULTIPLE_CHOICE",
    "graph": {
      "title": "Meyve Satışları",
      "type": "bar",
      "labels": ["Elma", "Armut", "Muz", "Çilek"],
      "values": [10, 5, 20, 8]
    }
  }
]`;

const q = extractQuestions(testJSON);
console.log(JSON.stringify(q, null, 2));
