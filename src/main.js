import './style.css';
import MediaInfoFactory from 'mediainfo.js';
import mediaInfoWasmUrl from 'mediainfo.js/MediaInfoModule.wasm?url';

document.querySelector('#app').innerHTML = `
  <div style="display:flex;justify-content:space-between;margin-bottom:1em;">
     <span style="color: black;font-weight: bold;">ComfyUI Video Workflow Extractor</span>
     <span style="font-size:12px;">All processing done in browser. <a href="https://github.com/gabecastello/comfyui-video-workflow-viewer" target="_blank">GitHub</a></span>
  </div>
  <div class="container">

  <input id="fileInput" type="file" accept=".mp4" />

  <p id="status"></p>

  <div style="display:flex;margin-bottom:1em;gap:1em;">
    <button id="copyBtn" disabled>Copy Workflow</button>
    <button id="downloadBtn" disabled>Download</button>
  </div>

  <textarea id="output" style="width:100%; height:40em; font-family: monospace;"></textarea>
  </div>
`;

const fileInput = document.getElementById('fileInput');
const status = document.getElementById('status');
const output = document.getElementById('output');
const copyBtn = document.getElementById('copyBtn');
const downloadBtn = document.getElementById('downloadBtn');

const mediaInfo = await MediaInfoFactory({
  format: 'object',
  locateFile: (path, prefix) =>
    path === 'MediaInfoModule.wasm' ? mediaInfoWasmUrl : `${prefix}${path}`,
});

fileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  status.textContent = 'Reading metadata...';
  output.value = '';

  try {
    const result = await mediaInfo.analyzeData(
      file.size,
      async (chunkSize, offset) =>
        new Uint8Array(
          await file.slice(offset, offset + chunkSize).arrayBuffer(),
        ),
    );

    const workflow = findWorkflow(result);
    let pretty;
    if (workflow) {
      status.textContent = 'Workflow extracted';
      status.style.color = 'green';
      copyBtn.textContent = 'Copy Workflow';
      pretty = workflow;
    } else {
      status.textContent =
        'No workflow found! Showing all the metadata searched';
      status.style.color = 'red';
      copyBtn.textContent = 'Copy Metadata';
      pretty = JSON.stringify(result);
    }

    try {
      pretty = JSON.stringify(JSON.parse(pretty), null, 2);
    } catch {}

    output.value = pretty;
    copyBtn.disabled = false;
    downloadBtn.disabled = false;
  } catch (err) {
    console.error(err);
    status.textContent = 'Failed';
  }
});

copyBtn.addEventListener('click', async () => {
  copyBtn.textContent = 'Copied';
  setTimeout(() => {
    copyBtn.textContent = 'Copy Workflow';
  }, 2000);
  await navigator.clipboard.writeText(output.value);
});

downloadBtn.addEventListener('click', async () => {
  downloadBtn.textContent = 'Downloading...';
  setTimeout(() => {
    downloadBtn.textContent = 'Download';
  }, 2000);
  const blob = new Blob([output.value], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'workflow.json';
  a.click();
  URL.revokeObjectURL(url);
});

function findWorkflow(obj) {
  if (!obj || typeof obj !== 'object') {
    return null;
  }

  if (typeof obj.workflow === 'string') {
    return obj.workflow;
  }

  for (const value of Object.values(obj)) {
    const found = findWorkflow(value);
    if (found) return found;
  }

  return null;
}
