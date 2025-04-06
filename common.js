const ENDPOINT = 'https://<PROJECT>.supabase.co/functions/v1/database-access';

const POS = ['Unknown', 'Noun', 'Verb', 'Adjective', 'Adverb', 'Article', 'Pronoun', 'Other'];
const ART = ['No article/unknown', 'de', 'het'];

function getParamsBasic() {
    let url = new URL(window.location.href);
    return {
        id: url.searchParams.get('id'),
        pass: url.searchParams.get('pass'),
        project: url.searchParams.get('project')
    }
}

function getData(params, cb, cbErr) {
    let {project, id, pass} = params;
    let endpointUrl = `${ENDPOINT.replace('<PROJECT>', project)}?pass=${pass}&id=${id}`;
    fetch(endpointUrl).then(res => {
        res.json().then(json => cb(json)).catch(er => cbErr(er));
    }).catch(e => cbErr(e));
}

function attemptGetData(cb, cbErr) {
    return getData(getParamsBasic(), cb, cbErr);
}

function randomFrom(arr) {
    // If array is empty or not provided, return empty array
    if (!Array.isArray(arr) || arr.length === 0) {
      return [];
    }
    
    // Get random index and return corresponding element
    const randomIndex = Math.floor(Math.random() * arr.length);
    return arr[randomIndex];
}

function miniTpl(template, data) {
    return template.replace(/\${([^}]+)}/g, (_, expr) => {
      // Handle loops: ${users.map(u => `<li>${u.name}</li>`).join('')}
      if (expr.includes('.map') || expr.includes('.forEach')) {
        return new Function('data', `return ${expr}`)(data);
      }
      // Handle conditionals: ${isAdmin ? '<button>Delete</button>' : ''}
      if (expr.includes('?')) {
        return new Function('data', `return ${expr}`)(data);
      }
      // Simple variables: ${user.name}
      return expr.split('.').reduce((obj, key) => obj?.[key.trim()], data) ?? '';
    });
}

function renderError(template, err) {
    template.innerHTML = `
    <div class="alert alert-danger" role="alert">
        An error has occured:
        <pre><code>${JSON.stringify(err)}</code></pre>
    </div>
    `;  
    template.classList.remove('visually-hidden');
}

// start execution
let template = document.getElementById('template');
attemptGetData(data => {
    if (data.error) {
        renderError(template, err);
        return;
    }
    let newHtml = miniTpl(template.innerHTML, data);
    template.innerHTML = newHtml;
    template.classList.remove('visually-hidden');
}, err => {
    renderError(template, err);
});