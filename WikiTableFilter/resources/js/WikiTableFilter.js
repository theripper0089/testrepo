function initTables($content) {
  var scope = $content && $content.length ? $content[0] : document;

  // Se c'è la tabella singola, rendila "multiple" per l'iterazione uniforme
  var single = scope.getElementById && scope.getElementById('wiki_table_filter');
  if (single) single.classList.add('wiki_table_filter_multiple');

  var tables = scope.getElementsByClassName('wiki_table_filter_multiple');
  for (var t = 0; t < tables.length; t++) {
    var tbl = tables[t];

    // ⚠️ Guard: se già inizializzata, salta (evita doppie righe di filtro)
    if (tbl.dataset && tbl.dataset.tfReady === '1') {
      continue;
    }
    tbl.dataset.tfReady = '1';

    // Assegna un id se manca o non è nel formato atteso
    if (!tbl.id || !/^wiki_table_filter_\d+$/.test(tbl.id)) {
      tbl.id = 'wiki_table_filter_' + t;
    }
    var tableId = tbl.id;

    // (opzionale) pulisci eventuali righe filtri residue
    // La maggior parte delle lib usa 'tr.fltrow' per la row dei filtri
    try { $(tbl).find('tr.fltrow').remove(); } catch (e) {}

    // Mappa tipi di filtro dalle classi nei <th>
    var ths = tbl.getElementsByTagName('th');
    var filterTypes = [];
    for (var i = 0; i < ths.length; i++) {
      var cls = ths[i].className || '';
      if (cls.indexOf('select-filter') > -1)       filterTypes.push('select');
      else if (cls.indexOf('checklist-filter') > -1) filterTypes.push('checklist');
      else if (cls.indexOf('multiple-filter') > -1)  filterTypes.push('multiple');
      else if (cls.indexOf('input-filter') > -1)     filterTypes.push('input');
      else                                           filterTypes.push('none');
    }

    // Istanzia TableFilter per la tabella corrente
    var tf = new TableFilter(tableId, {
      base_path: mw.config.get('wgScriptPath') + '/extensions/WikiTableFilter/resources/',
      responsive: true,
      ignore_diacritics: true,
      filters_row_index: 1,
      enable_checklist_reset_filter: false,
      enable_slc_reset_filter: false
    });
    tf.filterTypes = filterTypes;

    tf.emitter.on(['initialized'], function () {
      var inputs = tbl.getElementsByTagName('input');
      for (var k = 0; k < inputs.length; k++) {
        var inp = inputs[k];
        if (inp && (inp.type || '').toLowerCase() === 'text') {
          try { inp.enterKeyHint = 'search'; } catch (e) {}
        }
      }
    });

    tf.emitter.on(['after-filtering'], function (inst) {
      inst.getValues().forEach(function (tuple) {
        var rowIndex = tuple[0];
        var rowCells = tuple[1];
        if (inst.isRowValid(rowIndex)) return;

        var colInd = 0;
        var rowValid = true;

        inst.eachCol(function () {
          var fType = inst.getFilterType(colInd);
          if (fType === 'checklist' || fType === 'multiple') {
            var columnValid = false;
            const searchTerms = inst.getFilterValue(colInd);
            if (searchTerms && searchTerms.length) {
              var cellValues = String(rowCells[colInd] || '')
                .split(',')
                .map(function (s) { return s.toLowerCase().trim(); });
              for (var st = 0; st < searchTerms.length; st++) {
                var needle = String(searchTerms[st] || '').toLowerCase().trim();
                if (cellValues.indexOf(needle) !== -1) { columnValid = true; break; }
              }
            } else {
              columnValid = true;
            }
            rowValid = rowValid && columnValid;
          } else {
            var v = String(inst.getFilterValue(colInd) || '').trim();
            if (v.length > 0) {
              rowValid = rowValid &&
                String(rowCells[colInd] || '').toLowerCase().trim() === v.toLowerCase();
            }
          }
          colInd++;
        });

        if (rowValid) inst.validateRow(rowIndex, true);
      });
    });

    tf.emitter.on(['after-populating-filter'], function (inst, colIndex, filter) {
      var feature = inst.feature && inst.feature('dropdown');
      if (!feature || !feature.opts) return;

      var $sel = $('#' + filter.id);

      feature.opts.slice().forEach(function (opt) {
        if (typeof opt !== 'string') return;
        if (/[,(]/.test(opt)) {
          $sel.children('option[value="' + opt + '"]').remove();
          var expanded = opt
            .replace(/[()]/g, '')
            .split(',')
            .map(function (s) { return s.trim(); })
            .filter(Boolean);

          var $th = $sel.closest('table').find('th').eq(colIndex);
          var extra = $th.data('filter-items');
          if (Array.isArray(extra)) {
            expanded = expanded.concat(extra.map(function (s) { return String(s).trim(); }));
          }

          var seen = Object.create(null);
          expanded.forEach(function (val) {
            if (val && !seen[val]) {
              $sel.append('<option value="' + val + '">' + val + '</option>');
              seen[val] = 1;
            }
          });
        }
      });

      var map = {};
      var options = $sel.find('option').toArray();
      var selected = $sel.val();

      options = options.filter(function (o) {
        if (map[o.value]) return false;
        map[o.value] = true;
        return true;
      }).sort(function (a, b) {
        var ta = a.text.toLowerCase(), tb = b.text.toLowerCase();
        return ta < tb ? -1 : ta > tb ? 1 : 0;
      });

      $sel.html('').append(options);
      $sel.val(selected);
    });

    // Avvio TableFilter
    tf.init();

    // Inizializza il multiselect SOLO sui <select> della tabella corrente, una volta sola
    var $table = $(tbl);
    $table.find('select').each(function () {
      var $sel = $(this);
      // Guard: se il plugin l’ha già wrappato in .btn-group, non reinizializzare
      if ($sel.parent('.btn-group').length) return;

      var first = $sel.find('option').get(0);
      if (first && first.value === '') { $(first).remove(); }

      $sel.multiselect({
        maxHeight: 200,
        buttonWidth: '100%',
        includeResetOption: true,
        enableCaseInsensitiveFiltering: true,
        filterPlaceholder: mw.message('wikitablefilter-search').text(),
        resetText: mw.message('wikitablefilter-clear').text(),
        onChange: function () { tf.filter(); },
        buttonText: function (options /*, select */) {
          if (options.length === 0) {
            return mw.message('wikitablefilter-filter').text();
          } else if (options.length === 1) {
            return mw.message('wikitablefilter-1filter').text();
          } else {
            return options.length + mw.message('wikitablefilter-filters').text();
          }
        }
      });
    });

    // Reset globale dei multiselect nella tabella corrente
    $table.find('.multiselect-reset').off('click.wtf').on('click.wtf', function () {
      tf.filter();
    });
  }
}