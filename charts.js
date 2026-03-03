let PIE, GROUPED, LINE;

function renderAnalytics(){
  const tripId = state.currentTripId;
  if(!tripId) return;
  Api.analytics(tripId).then(a=>{
    const base = a.baseCurrency || 'TWD';

    // Pie by category
    const cats = Object.keys(a.byCat);
    const catVals = cats.map(k=> a.byCat[k]);
    drawPie('chart-pie', cats, catVals, base);

    // Grouped bar per member per day
    const names = Object.keys(a.byMemberByDate);
    const allDays = [...new Set(names.flatMap(n => Object.keys(a.byMemberByDate[n])))]
      .sort((d1,d2)=> new Date(d1)-new Date(d2));
    const datasets = names.map((n,i)=>({
      label:n,
      data: allDays.map(day => +(a.byMemberByDate[n][day]||0).toFixed(2)),
      backgroundColor: colorForIndex(i, .75)
    }));
    drawGrouped('chart-grouped', allDays, datasets, base);

    // Line daily shared
    const days = Object.keys(a.dailyShared).sort((d1,d2)=> new Date(d1)-new Date(d2));
    const vals = days.map(d=> +(a.dailyShared[d]||0).toFixed(2));
    drawLine('chart-line', days, vals, base);
  });
}

function renderSettlementList(){
  const tripId = state.currentTripId;
  if(!tripId) return;
  Api.settlements(tripId).then(s=>{
    const trip = state.trips.find(t=>t.id===tripId);
    const base = trip ? trip.baseCurrency : 'TWD';
    const tb = document.querySelector('#settle-table tbody');
    tb.innerHTML='';
    s.transfers.forEach(t=>{
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${t.from}</td><td>${t.to}</td><td>${fmt.money(t.amount, base)}</td>`;
      tb.appendChild(tr);
    });
  });
}

function drawPie(id, labels, data, base){
  const ctx = document.getElementById(id);
  if (PIE) PIE.destroy();
  PIE = new Chart(ctx, {
    type:'pie',
    data:{ labels, datasets:[{ data, backgroundColor: labels.map((_,i)=>colorForIndex(i,.9)) }]},
    options:{
      plugins:{
        legend:{ position:'bottom' },
        tooltip:{ callbacks:{ label:(c)=> `${c.label}: ${fmt.money(c.raw, base)}`}}
      }
    }
  });
}
function drawGrouped(id, labels, datasets, base){
  const ctx = document.getElementById(id);
  if (GROUPED) GROUPED.destroy();
  GROUPED = new Chart(ctx, {
    type:'bar',
    data:{ labels, datasets },
    options:{
      responsive:true,
      scales:{ y:{ beginAtZero:true, ticks:{ callback:(v)=>fmt.money(v, base)} } },
      plugins:{ legend:{ position:'bottom' } }
    }
  });
}
function drawLine(id, labels, data, base){
  const ctx = document.getElementById(id);
  if (LINE) LINE.destroy();
  LINE = new Chart(ctx, {
    type:'line',
    data:{ labels, datasets:[{ label:'共同花費', data, tension:.2, borderColor:'#3d5a40', backgroundColor:'rgba(61,90,64,.15)' }]},
    options:{
      scales:{ y:{ beginAtZero:true, ticks:{ callback:(v)=>fmt.money(v, base)} } },
      plugins:{ legend:{ display:false } }
    }
  });
}

function colorForIndex(i, alpha=1){
  const palette = ['#8c6a4a','#3d5a40','#6e8f72','#b49b7a','#2f4833','#a3b18a','#656d4a','#936639'];
  const base = palette[i % palette.length];
  const rgb = hexToRgb(base);
  return `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`;
}
function hexToRgb(hex){
  const v = hex.replace('#','');
  const bigint = parseInt(v, 16);
  return { r:(bigint>>16)&255, g:(bigint>>8)&255, b:bigint&255 };
}
``
