const suppliers = [{
  _id: 1,
  number: 20,
  viewName: "Rubber Chicken Ltd",
  details: "13 Some Road, SomePlace, 23948 Burgh" },
{
  _id: 2,
  number: 22,
  viewName: "Pulley Inc.",
  details: "Pulley Square, Out There, A637Z3 Boondocks" }];


const bookings = [{
  _id: 1,
  number: 1,
  date: new Date(2016, 0, 3),
  details: "Monthly Pulley payment",
  supplier_id: 2,
  amount: 12.59,
  currency: "USD" },
{
  _id: 1,
  number: 2,
  date: new Date(2016, 0, 4),
  details: "Big Rubber Chicken order",
  supplier_id: 1,
  amount: 47623.45,
  currency: "BOO" }];


const supplierDataStore = new DevExpress.data.CustomStore({
  key: "_id",
  load: function () {// using this
    return suppliers;
  },
  insert: function (v) {
    return $.Deferred(d => {
      suppliers.push(v);
      d.resolve(v._id);
    }).promise();
  } });



const supplierPopupDataStore = new DevExpress.data.CustomStore({
  key: "_id",
  load: function () {
    const that = this;
    return $.Deferred(d => {
      const result = that.customFilter ?
      that.getFilteredData(that.customFilter) : suppliers;
      that._totalCount = result.length;
      d.resolve(result, { totalCount: that._totalCount });
    }).promise();
  },
  totalCount: function () {
    return this._totalCount ? this._totalCount : 0;
  } });


supplierPopupDataStore.supplierByKey = key => {
  return suppliers.find(s => s._id === key);
};

supplierPopupDataStore.indexByKey = key => {
  return suppliers.findIndex(s => s._id === key);
};

supplierPopupDataStore.indexByObject = o => {
  return suppliers.findIndex(s => s._id === o._id);
};

["supplierByKey", "indexByKey", "indexByObject"].forEach(s => supplierDataStore[s] = supplierPopupDataStore[s]);


supplierPopupDataStore.customFilter = "";
supplierPopupDataStore.getFilteredData = filterString => {
  function* conditionalYield(row, yieldedIds) {
    if (!yieldedIds.includes(row._id)) {
      yieldedIds.push(row._id);
      yield row;
    }
  }
  function* preciseNumbers(yieldedIds) {
    for (let row of suppliers) {
      if (row.number == filterString) {
        yield* conditionalYield(row, yieldedIds);
      }
    }
  }
  function* partialNumbers(yieldedIds) {
    for (let row of suppliers) {
      if (row.number.toString().includes(filterString)) {
        yield* conditionalYield(row, yieldedIds);
      }
    }
  }
  function* partialViewName(yieldedIds) {
    for (let row of suppliers) {
      if (row.viewName.includes(filterString)) {
        yield* conditionalYield(row, yieldedIds);
      }
    }
  }
  function* partialDetails(yieldedIds) {
    for (let row of suppliers) {
      if (row.details.includes(filterString)) {
        yield* conditionalYield(row, yieldedIds);
      }
    }
  }
  function* combine() {
    let yieldedIds = [];
    yield* preciseNumbers(yieldedIds);
    yield* partialNumbers(yieldedIds);
    yield* partialViewName(yieldedIds);
    yield* partialDetails(yieldedIds);
  }
  return Array.from(combine());
};

const supplierDisplayString = s => s ? `${s.number} - ${s.viewName}` : "Not assigned";
const bookingSupplierDisplayString = b => supplierDisplayString(supplierDataStore.supplierByKey(b.supplier_id));


const grid = $("#grid").dxDataGrid({
  dataSource: bookings,
  columns: [{
    dataField: "number",
    dataType: "number",
    format: {
      type: "decimal",
      precision: 5 },

    allowEditing: false },
  {
    dataField: "date",
    dataType: "date" },

  "amount",
  "currency",
  "details", {
    dataField: "supplier_id",
    caption: "Supplier",
    calculateDisplayValue: bookingSupplierDisplayString,
    lookup: {
      dataSource: {
        store: supplierDataStore },

      valueExpr: "_id",
      displayExpr: supplierDisplayString },

    editCellTemplate: (cellElement, cellInfo) => {
      const $editor = $("<div>").appendTo(cellElement).dxTextBox({
        readOnly: true,
        value: cellInfo.text });


      let supplierPopupList, form, detailForm;
      let creatingNew = false;

      function confirmAssignment() {
        if (creatingNew) {
          const vr = detailForm.validate();
          if (vr.isValid) {
            const newSupplier = detailForm.option("formData");
            // useless way of generating a random id
            newSupplier._id = parseInt(Math.random() * 1000000);
            supplierDataStore.insert(newSupplier);
            $editor.dxTextBox("instance").option("value", cellInfo.column.lookup.displayExpr(newSupplier));
            cellInfo.setValue(newSupplier._id);
            popup.hide();
          }
        } else
        {
          const selectedItems = supplierPopupList.option("selectedItems");
          if (selectedItems.length == 1) {
            $editor.dxTextBox("instance").option("value", cellInfo.column.lookup.displayExpr(selectedItems[0]));
            cellInfo.setValue(selectedItems[0]._id);
            popup.hide();
          }
        }
      }

      function escapeOut() {
        popup.hide();
      }

      function createNewSupplier() {
        // "this" is the button that triggered the event - 
        // there is no very easy way of getting hold of the button otherwise
        this.option("disabled", true);

        supplierPopupList.option("disabled", true);
        form.getEditor("search").option("disabled", true);
        detailForm.option("disabled", false);
        detailForm.option("formData", {});
        detailForm.getEditor("number").focus();
        creatingNew = true;
      }


      const popup = $('<div class="dx-dropdowneditor-overlay">').appendTo(cellElement).dxPopover({
        height: "60ex",
        width: "60ex",
        showTitle: false,
        showCloseButton: false,
        shading: false,
        position: {
          collision: "flipfit flipfit",
          my: "top",
          at: "bottom" },

        toolbarItems: [
        {
          toolbar: "top",
          widget: "dxButton",
          location: "before",
          options: {
            text: "New Supplier (Alt-N)",
            accessKey: "n",
            onClick: createNewSupplier } },


        {
          toolbar: "bottom",
          widget: "dxButton",
          location: "after",
          options: {
            text: "OK",
            type: "default",
            onClick: confirmAssignment } },


        {
          toolbar: "bottom",
          widget: "dxButton",
          location: "after",
          options: {
            text: "Cancel",
            onClick: escapeOut } }],



        contentTemplate: () => {
          const $form = $("<div>").dxForm({
            items: [
            {
              name: "search",
              itemType: "simple",
              editorType: "dxTextBox",
              editorOptions: {
                placeholder: "Search for a supplier",
                mode: "search",
                value: "", // set this to prevent erroneous change events in the future
                valueChangeEvent: "keyup",
                onValueChanged: ({ value }) => {
                  supplierPopupDataStore.customFilter = value;
                  supplierPopupList.reload();
                  supplierPopupList.selectItem(0);
                } } },


            {
              name: "list",
              itemType: "simple",
              template: () => {
                const $list = $("<div>").dxList({
                  dataSource: {
                    store: supplierPopupDataStore },

                  selectionMode: "single",
                  itemTemplate: (itemData, itemIndex, itemElement) => {
                    itemElement.text(`${itemData.number} - ${itemData.viewName}`);
                  },
                  onSelectionChanged: ({ addedItems }) => {
                    if (addedItems.length > 0) {
                      detailForm.option("formData", addedItems[0]);
                    }
                  } });

                supplierPopupList = $list.dxList("instance");
                $list.dblclick(confirmAssignment);
                return $list;
              } },

            { itemType: "empty" },
            {
              name: "detailform",
              itemType: "simple",
              template: () => {
                const $detailForm = $("<div>").dxForm({
                  labelLocation: "top",
                  disabled: true,
                  items: [
                  {
                    itemType: "group",
                    colCount: 4,
                    items: [
                    {
                      itemType: "simple",
                      dataField: "number",
                      colSpan: 1,
                      isRequired: true,
                      editorOptions: {
                        placeholder: "Number" } },


                    {
                      itemType: "simple",
                      dataField: "viewName",
                      colSpan: 3,
                      isRequired: true,
                      label: {
                        text: "Name" },

                      editorOptions: {
                        placeholder: "Name" } },


                    {
                      itemType: "simple",
                      dataField: "details",
                      editorType: "dxTextArea",
                      colSpan: 4,
                      editorOptions: {
                        height: "12ex",
                        placeholder: "Supplier Details" } }] }] });






                detailForm = $detailForm.dxForm("instance");
                return $detailForm;
              } }] });




          supplierPopupList.selectItem(supplierPopupDataStore.indexByKey(cellInfo.value));

          function upArrow() {
            supplierPopupDataStore.totalCount().done(count => {
              if (count > 0) {
                const selectedItems = supplierPopupList.option("selectedItems");
                const currentIndex = selectedItems ?
                supplierPopupDataStore.indexByObject(selectedItems[0]) : 1;
                if (currentIndex > 0) {
                  supplierPopupList.selectItem(currentIndex - 1);
                }
              }
            });
          }

          function downArrow() {
            supplierPopupDataStore.totalCount().done(count => {
              if (count > 0) {
                const selectedItems = supplierPopupList.option("selectedItems");
                const currentIndex = selectedItems ?
                supplierPopupDataStore.indexByObject(selectedItems[0]) : -1;
                const newIndex = currentIndex + 1;
                if (newIndex >= 0 && newIndex < count) {
                  supplierPopupList.selectItem(currentIndex + 1);
                }
              }
            });
          }

          form = $form.dxForm("instance");

          form.getEditor("search").registerKeyHandler("upArrow", upArrow);
          form.getEditor("search").registerKeyHandler("downArrow", downArrow);

          supplierPopupList.registerKeyHandler("upArrow", upArrow);
          supplierPopupList.registerKeyHandler("downArrow", downArrow);

          form.registerKeyHandler("enter", confirmAssignment);
          supplierPopupList.registerKeyHandler("enter", confirmAssignment);
          form.registerKeyHandler("escape", escapeOut);
          supplierPopupList.registerKeyHandler("escape", escapeOut);

          return $form;
        },
        onShown: () => {
          if (supplierPopupDataStore.customFilter) {
            supplierPopupDataStore.customFilter = "";
            supplierPopupList.reload();
          }
          form.getEditor("search").focus();
        },
        onHidden: () => grid.closeEditCell() }).
      dxPopover("instance");

      popup.option("position.of", $editor);
      setTimeout(() => {
        popup.show();
      });
    } }],


  editing: {
    mode: "batch",
    allowAdding: true,
    allowDeleting: true,
    allowUpdating: true } }).

dxDataGrid("instance");