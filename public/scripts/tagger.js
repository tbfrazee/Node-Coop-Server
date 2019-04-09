/**
 * 
 * 
 * @param {any} inputEl     A DOM reference to an input or textarea element to which the tagger should be attached
 * @param {any} hiddenEl    A DOM reference to an input or textarea (typically hidden) that will store the comma-delimited results for submission
 * @param {any} settings    An object of settings.
 * 
 * Settings:
 *      url:                A URL target to make AJAX requests to get autocomplete values. If this value is defined, a request will be sent to retrieve values.
 *                          The URL includes a query key 'inputVal' that contains the text entered so far. The server should respond with JSON including a value called "values"
 *                          that contains an array or object of key-value pairs that represents the possible autocomplete values.
 *      ajaxMethod:         HTTP method to get autocomplete values. Only used if url is defined. Default: "GET".
 *      values:             An array or object of key-value pairs that represents the possible autocomplete values. Only used if settings.url is not defined.
 *      allowDuplicates:    True to allow the same tag to be selected multiple times. False to remove an option once it's selected. Noop if settings.autocompleteOnly is true.
 *      autocompleteOnly:   True to remove tagging functionality. Autocomplete selections will simply be applied as the value of inputEl.
 *      autocompleteAppend: True to append multiple autocomplete values together as the value of inputEl, delimited by a comma and space. Only applies if settings.autocompleteOnly is true.
 */

function SimpleTagger(inputEl, hiddenEl, settings) {

    let tagger = this;
    tagger.tagValues = [];
    tagger.settings = settings;
    tagger.events = {};

    let getValues;
    let selectedIndex = -1;
    let acDiv, selectedDiv;

    //Create selected Div
    if(!tagger.settings.autocompleteOnly) {
        selectedDiv = document.createElement("div");
        selectedDiv.classList = "ac-list-selected";
        inputEl.parentNode.insertBefore(selectedDiv, inputEl.nextSibling);
    }

    setGetValues();

    function setGetValues() {
        if(tagger.settings.url)
            try {
                getValues = await getValuesAjax;
            } catch(err) {}
        else if(tagger.settings.values && Array.isArray(tagger.settings.values))
            getValues = getValuesArray;
        else if(tagger.settings.values && typeof tagger.settings.values == 'object')
            getValues = getValuesObject;
        else
            return false;
    }

    function getValuesAjax(inputVal) {
        return new Promise((resolve, reject) => {
            let method = tagger.settings.method ? tagger.settings.method : "GET";
            let req = new XMLHttpRequest();
            req.onload = function (res) {
                if(res.values) {
                    if(Array.isArray(res.values))
                        resolve(getValuesArray(res.values));
                    else if(typeof res.values == "object")
                        resolve(getValuesObject(res.values));
                    else
                        reject("No valid values returned.");
                }
            }
            req.open(method, tagger.settings.url + "?val=" + inputVal + "&" + Date.now(), true);
            req.setRequestHeader("X-Requested-With", "XMLHttpRequest");
            req.responseType = "json";
            req.send();
        });
    }

    function getValuesArray(inputVal) {
        return new Promise((resolve, reject) => {
            let ret = [];
            for(i = 0; i < settings.values.length; i++) {
                if(settings.values[i].substr(0, inputVal.length).toLowerCase() == inputVal.toLowerCase()) {
                    ret.push(settings.values[i]);
                }
            }
            return resolve(ret);
        });
    }

    function getValuesObject(inputVal) {
        return new Promise((resolve, reject) => {
            let ret = [];
            for(i in settings.values) {
                if(settings.values[i].substr(0, inputVal.length).toLowerCase() == inputVal.toLowerCase()) {
                    ret.push(settings.values[i]);
                }
            }
            return resolve(ret);
        });
    }

    //Oninput - create autocomplete
    inputEl.oninput = async function() {
        if(inputEl.value.length) {
            destroyAC();
            let acVals = await getValues(inputEl.value);
            if(acVals) {
                acDiv = document.createElement("ul");
                acDiv.classList = "ac-list";
                acDiv.setAttribute("id", inputEl.id + "-ac-list");
                acDiv.setAttribute("style", "width: " + inputEl.offsetWidth + "px;");
                for(val in acVals) {
                    if(tagger.settings.allowDuplicates || !tagger.tagValues.includes(acVals[val])) {
                        let lDiv = document.createElement("li");
                        lDiv.classList = "ac-list-item";
                        lDiv.innerHTML = "<b>" + acVals[val].substr(0, inputEl.value.length) + "</b>" + acVals[val].substr(inputEl.value.length);
                        lDiv.dataset.acValue = acVals[val];
                        lDiv.onclick = function () { acClick(lDiv); };
                        acDiv.appendChild(lDiv);
                    }
                }
                inputEl.parentNode.insertBefore(acDiv, selectedDiv.nextSibling);
            }
        } else
            destroyAC();
    }

    inputEl.onkeydown = function (event) {
        if([13, 38, 40].includes(event.keyCode)) {
            if(acDiv) {
                let items = acDiv.children;
                if(items.length) {
                    if(event.keyCode == 40) { //DOWN key
                        if(selectedIndex < (items.length - 1)) {
                            let prevItem = items[selectedIndex];
                            let activeItem = items[++selectedIndex];
                            if(prevItem)
                                toggleClass(prevItem, "active");
                            if(activeItem)
                                toggleClass(activeItem, "active");
                        }
                    } else if(event.keyCode == 38) { //UP key
                        if(selectedIndex > 0) {
                            let prevItem = items[selectedIndex];
                            let activeItem = items[--selectedIndex];
                            if (prevItem)
                                toggleClass(prevItem, "active");
                            if(activeItem)
                                toggleClass(activeItem, "active");
                        }
                    } else if(event.keyCode == 13) { //ENTER key
                        acClick(items[selectedIndex]);
                    }

                } else
                    selectedIndex = -1;
            }
        }
    }

    function acClick(el) {
        if(tagger.settings.autocompleteOnly) {
            inputEl.value = tagger.settings.autocompleteAppend ? (inputEl.value + ", " + el.dataset.acValue) : el.dataset.acValue;
            triggerEvent("autocompleteClick");
        } else {
            let tag = document.createElement("span");
            tag.classList = "tag";
            tag.innerHTML = el.dataset.acValue;
            tag.dataset.acValue = el.dataset.acValue;
            let closeSpan = document.createElement("span");
            closeSpan.classList = "tag-close";
            closeSpan.innerHTML = "&times;";
            closeSpan.onclick = function () { deleteTag(tag); };
            closeSpan.onmouseover = function () { toggleClass(tag, "del-hover"); };
            closeSpan.onmouseout = function () { toggleClass(tag, "del-hover"); };
            tag.appendChild(closeSpan);
            selectedDiv.appendChild(tag);
            tagger.tagValues.push(el.dataset.acValue);
            hiddenEl.value = tagger.tagValues.join(",");
            triggerEvent("onTag");
            destroyAC();
            inputEl.value = "";
        }
    }

    function toggleClass(el, clName) {
        if(el.classList.contains(clName)) {
            el.classList.remove(clName);
        } else {
            el.classList.add(clName);
        }
    }

    function deleteTag(el) {
        let index = tagger.tagValues.indexOf(el.dataset.acValue);
        if(index > -1) {
            tagger.tagValues.splice(index, 1);
            hiddenEl.value = tagger.tagValues.join(",");
        }
        el.parentNode.removeChild(el);
    }

    function destroyAC() {
        let acDiv = document.getElementById(inputEl.id + "-ac-list");
        selectedIndex = -1;
        if(acDiv)
            acDiv.parentNode.removeChild(acDiv);
    }

    function triggerEvent(eventName, argArray) {
        if(typeof tagger.events[eventName] === 'function')
            return tagger.events[eventName](...argArray);
    }

    tagger.destroy = function () {
        destroyAC();
        inputEl.oninput = undefined;
        inputEl.onkeydown = undefined;
        selectedDiv.parentNode.removeChild(selectedDiv);
    }

    tagger.on = function(eventName, handler) {
        tagger.events[eventName] = handler;
    }
}