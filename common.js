const ENDPOINT = 'https://<PROJECT>.supabase.co/functions/v1/database-access';

const POS = ['Unknown', 'Noun', 'Verb', 'Adjective', 'Adverb', 'Article', 'Pronoun', 'Other'];
const ART = ['No article/unknown', 'de', 'het', 'de/het'];

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
        try {
            // Handle function calls: ${formatDate(user.createdAt)}
            if (/[\w]\(.*\)/.test(expr)) {
                // Extract function name and arguments
                const fnMatch = expr.match(/([\w.]+)\((.*)\)/);
                if (fnMatch) {
                    const [_, fnPath, argsStr] = fnMatch;
                    // Get function from data (support nested like utils.formatDate)
                    const fn = fnPath.split('.').reduce((obj, key) => obj?.[key.trim()], data);
                    if (typeof fn === 'function') {
                        // Process arguments (support both variables and literals)
                        const args = argsStr.split(',').map(arg => {
                            arg = arg.trim();
                            // If argument is a string literal (in quotes)
                            if (/^['"].*['"]$/.test(arg)) {
                                return arg.slice(1, -1);
                            }
                            // If argument is a variable reference
                            return arg.split('.').reduce((obj, key) => obj?.[key.trim()], data) ?? arg;
                        });
                        return fn(...args);
                    }
                }
            }
            
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
            
        } catch (e) {
            console.warn(`Template error in expression: ${expr}`, e);
            return '';
        }
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

function _pos(display) {
    return POS[display.part_of_speech]
}
function _selectedZin(zinnen) {
    // rule for now: first
    return zinnen.length > 0 ? zinnen[0] : null;
}

function quickBugfix_displayLastSentences(zinnen) {
    let sel = zinnen.slice(-4);
    // current selection: first sentence. we remove a sentence 
    // anyway (the first sentence) (thus becoming three).
    // if alr empty just return empty 
    let simpleStrings = sel.map(x => [x.nl, x.en])
    .map(za => `${za[0]} ⟶ ${za[1]}`);
    simpleStrings.shift();
    if (simpleStrings.length > 0) {
        return simpleStrings.join('<br>')
    } else {
        return '';
    }
}
// start execution
let template = document.getElementById('template');
attemptGetData(data => {
    if (data.error) {
        renderError(template, err);
        return;
    }
    let passthroughObject = {
        ...data,
        ...{
            // attach extra functions to pass into template
            fn: {
                pos: _pos,
                selzin: (zinnen, key) => (JSON.parse(JSON.stringify(_selectedZin(zinnen))))[key].toString(),
                zinprop: (zin, key) => JSON.parse(JSON.stringify(zin))[key].toString(),
                quickBugfix_displayLastSentences: quickBugfix_displayLastSentences,
            },
            prop: {
                article: data.display.noun_article != 0 ? `<span class="display-6">${ART[data.display.noun_article]} </span>` : ''
            }
        }
    };
    console.log(passthroughObject);
    let newHtml = miniTpl(template.innerHTML, passthroughObject);
    template.innerHTML = newHtml;
    template.classList.remove('visually-hidden');
}, err => {
    renderError(template, err);
});