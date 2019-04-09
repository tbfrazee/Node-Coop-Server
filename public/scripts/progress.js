let progress = {
	nodes: 4,
	active: 0,
	done: 0,
    visited: [],
    statuses: [],
	classArray: ["active", "done", "invalid"]
}

//Not yet implemented.
function makeProgress(nodes) {
    for (let i = 0; i < nodes.length; i++) {
        let a = document.createElement("a");
        a.href = "#";
        a.onclick = "progressNodeClick(" + i + "); return false;";
        let node = document.createElement("div");
        if (i = 0) node.classList = "progress-node progres-active";
        else node.classList = "progress-node";
        let label = document.createElement("span");
        label.classList = "progress-label";
        label.innerHTML = i + 1;
        let title = document.createElement("span");
        title.classList = "progress-title";
        title.innerHTML = nodes[i];

        node.append(label);
        node.append(title);
        a.append(node);
        $("#progress").append(a);
    }
}

function progressNodeClick(num) {
    let parent = $("#progress");
    let fromEl = $(parent).siblings(".form-part").eq(progress.active);
    let toEl = $(parent).siblings(".form-part").eq(num);
    //Validate form on current page
    let fromForms = $(fromEl).find("form");
    if (fromForms.length) {
        let validated = true;
        for (let i = 0; i < fromForms.length; i++) {
            if (!validateForm(fromForms[i])) {
                validated = false;
            }
        }
        if (validated) {
            progress.statuses[progress.active] = "done";
            doCollapse(fromEl, toEl);
            updateProgress(num);
        } else {
            progress.statuses[progress.active] = "invalid";
            if (num < progress.active) {
                doCollapse(fromEl, toEl);
                updateProgress(num);
            } else {
                updateProgress(progress.active);
            }
        }
    } else {
        progress.statuses[progress.active] = "done";
        doCollapse(fromEl, toEl);
        updateProgress(num);
    }
}

function doCollapse(toClose, toOpen) {
    $(toClose).collapse("hide");
    $(toOpen).collapse("show");
}

function updateProgress(num, isBack) {
	let nodes = $("#progress").find(".node");
	
    nodes.each(function (index, node) {
        $(node).removeClass(progress.classArray);
        if (index == num) {
            if (progress.statuses[num] == "invalid") {
                $(node).find(".label").html("!");
                if (isBack)
                    progress.active = num;
            } else {
                progress.statuses[num] = "active";
                $(node).find(".label").html((num + 1) + "");
                progress.active = num;
            }
        } else if (progress.statuses[index] == "done") {
            $(node).find(".label").html("&#10003;");
        }
        if (!progress.visited.includes(num)) {
            progress.visited.push(num);
        }
        $(node).addClass(progress.statuses[index]);
    });

    updateBarGradients(nodes);
	
	if(typeof onProgressUpdate == "function") {
		onProgressUpdate(num);
	}
}

function updateBarGradients(nodes) {
    let bars = $("#progress").find(".bar");
    bars.each(function (index, bar) {
        let prev = $(nodes).eq(index).css("background-color");
        let next = $(nodes).eq(index + 1).css("background-color");
        $(bar).css("background", "linear-gradient(to right, " + prev + ", " + next + ")");
    });
}
