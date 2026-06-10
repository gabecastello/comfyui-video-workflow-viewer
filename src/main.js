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

  <button id="copyBtn" disabled>Copy Workflow</button>

  <pre id="output"></pre>
  </div>
`;

const fileInput = document.getElementById('fileInput');
const status = document.getElementById('status');
const output = document.getElementById('output');
const copyBtn = document.getElementById('copyBtn');

const mediaInfo = await MediaInfoFactory({
  format: 'object',
  locateFile: (path, prefix) =>
    path === 'MediaInfoModule.wasm' ? mediaInfoWasmUrl : `${prefix}${path}`,
});

fileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  status.textContent = 'Reading metadata...';
  output.textContent = '';

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

    output.textContent = pretty;
    copyBtn.disabled = false;
  } catch (err) {
    console.error(err);
    status.textContent = 'Failed';
  }
});

copyBtn.addEventListener('click', async () => {
  await navigator.clipboard.writeText(output.textContent);
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
