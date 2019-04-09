const cols = [
	{name: "startTime", size: 2},
	{name: "endTime", size: 2},
	{name: "requestedBy", size: 3},
	{name: "assignedTo", size: 3},
	{name: "status", size: 2}
];

var rows = [];

function getRequests(status, roles, on) {
	let data = {status: status ? status : "open", roles: roles ? roles : "requested", on: on ? on : "user"};
	clearRows();
	makeLoadingRow();
	
	$.ajax({
		method: 'post',
		url: '../getRequests',
		data: data,
		complete: function(res,status,xhr){
			var response = JSON.parse(res.responseText);
			clearRows();
			if(response.success && response.rows.length) {
				for(i in response.rows) {
					makeRow(response.rows[i]);
				}
			} else if(response.success) {
				makeEmptyRow();
			} else {
				makeErrorRow(response.error);
			}
		}
	});
}

function clearRows() {
	$("#requestTableBody").empty();
	rows = [];
}

function makeRow(data) {
    let appendTo = "#requestTableBody";
    let row = document.createElement("tr");
    row.onClick = "rowSelect(this)";
    for (let i = 0; i < cols.length; i++) {
        let col = document.createElement("td");
        let span = document.createElement("span");
        if (cols[i].name.toLowerCase().includes("time")) {
            let dVal = new Date(data[cols[i].name] * 1000);
            let sVal = (dVal.getMonth() + 1) + "/" + dVal.getDate() + "/" + dVal.getFullYear() + " " + dVal.getHours() + ":" + dVal.getMinutes();
            span.innerHTML = sVal;
        } else {
            span.innerHTML = data[cols[i].name];
        }
        col.appendChild(span);
        row.appendChild(col);
    }
    let linkCol = document.createElement("td");
    let linkBtn = document.createElement("a");
    linkBtn.classList = "btn btn-primary";
    linkBtn.href = "/requestdetail?reqId=" + data.requestId;
    linkBtn.innerHTML = "View This Request";
    linkCol.appendChild(linkBtn);
    row.appendChild(linkCol);

    rows.push(row);
    $(appendTo).append(row);
}

function makeUninitRow() {
    let row = document.createElement("tr");
    row.className = "uninit-row"
    let col = document.createElement("td");
    col.colSpan = "6";
	col.innerHTML = "Select a category on the left to load requests.";
	row.appendChild(col);
    $("#requestTableBody").append(row);
}

function makeEmptyRow() {
    let row = document.createElement("tr");
    row.className = "empty-row"
    let col = document.createElement("td");
    col.colSpan = "6";
    col.innerHTML = "Nothing to show here...";
    row.appendChild(col);
    $("#requestTableBody").append(row);
}

function makeLoadingRow() {
    let row = document.createElement("tr");
    row.className = "loading-row"
    let col = document.createElement("td");
    col.colSpan = "6";
    col.innerHTML = "LOADING -- Please wait...";
    row.appendChild(col);
    $("#requestTableBody").append(row);
}

function makeErrorRow(message) {
    let row = document.createElement("tr");
    row.className = "error-row"
    let col = document.createElement("td");
    col.colSpan = "6";
    col.innerHTML = message ? message : "There was an error loading requests. Please try again.";
    row.appendChild(col);
    $("#requestTableBody").append(row);
}

function onStatusFilterClick(btn) {
    let filter = $(btn).get(0).id.replace("statusFilterBtn", "").toLowerCase();
    switch (filter) {
        case "open":
            if ($("#roleFilterBtnAssigned").hasClass("active")) {
                $("#roleFilterBtnAssigned").removeClass("active");
                $("#roleFilterBtnAssigned").addClass("disabled");
            }
            break;
        default:
            if ($("#roleFilterBtnAssigned").hasClass("disabled")) {
                $("#roleFilterBtnAssigned").removeClass("disabled");
            }
    }

    let roles = [];
    if ($("#roleFilterBtnRequested").hasClass("selected-row"))
        roles.push("requested");
    if ($("#roleFilterBtnAssigned").hasClass("selected-row"))
        roles.push("assigned");

    getRequests(filter, roles);

    $("#statusFilterBtnList").children().each(function (index, el) {
        $(el).removeClass("selected-row");
    });
    $(btn).addClass("selected-row");
}