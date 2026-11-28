// Join the Bunker: cloud save and leaderboards (talks to the bunker-api Worker). No accounts: a recovery code is the only key.
(() => {
const API = "https://bunker-api.ejcosmedia.workers.dev";
const HIDE = new Set(["1.lanaisonesexcassbtc__", "1_sleepynigga", "903coon", "918.ih8teslutts", "_.satans._.favourite._.whore._", "__fucked_____up__", "_fucktooka", "_sexccdarkskinn._", "_yass1n.2010", "abdulaziz172016", "alivekidnamedcobi2014", "ariel20136", "bettiesbackbitches", "bigbitch776", "bitch_yougaytoo", "bitchessloveskiii._", "bitchtsrich", "chinkmq.37", "denise2sexcc_", "dimitriarakelyan2012", "emmy_gee_2010", "ezeye2010", "fck.svlovi3_", "fckklilserg_", "feras02010", "fuck_my_feelings4", "fuckallyall.ecila", "fuckthisusernaame", "glittertits_13", "gomezryan2012", "guesswatdisdick", "gyugyu201311", "h4ppy.whore", "harveytecson2012", "henry.gk.2013", "i_fuckinghate_australia", "imfckinunknown", "ineedadickandconversationn", "itsya_favnigga", "j0w3nfckno", "jakep_2009", "jankyoungnigga_pt2", "jason.hughes2010", "jaydenbadcock", "jaysnumberonegooner", "jb_yo_fav_nigge", "juan20091234413", "kyle_campbell2011", "lebronshairyniggaballsacks", "leoy2011", "lolpop2012ehe", "luhsexcstudda_", "maren_mcgill2013", "mateiantonio.2013", "mightbetherealestbitchalive", "mrs.takeyobitchforaride", "niggamonkeywhorebitchasshole", "niggasgotsomecash", "niggasinparis6789", "niggatron47", "nodrjon_2013", "ofri19042013", "pixcell.slutz", "pizzadude2010", "ramyalasmar2011", "rickrocksuckmycock1234", "ronan_burke.2011", "sagesssbitch", "sam.lee2015", "sexcdrac_", "slut4amaya", "slutty_starzzz", "sol_raped", "spaceshit_998", "ssup.nigga1", "stfufuckoff20", "t5_fuck_a_hoe", "theesexieststoner_", "thickdickgotdisabled", "thtniggazo9", "triston20100", "truckfucked", "whatthefuckaidan_", "xavienred2014", "your_fav_nigg97", "yourfavorite_gothmilf"]);
// handles that never show by name on boards (crude, or a young age in the name). They show as "Survivor B#".
const hidden = h => HIDE.has(h) || /(20(09|1[0-7]))|(\d{2}\s?yo)/.test(h) || /(fuck|shit|nazi|rape|nigg|fag|cunt|dick|cock|porn|sex|hitler|kkk|pedo)/.test(h);
const j = async (path, opt) => { const r = await fetch(API + path, opt); const b = await r.json().catch(() => ({})); if (!r.ok) throw Object.assign(new Error(b.error || "error"), { status: r.status }); return b; };
const post = (path, body) => j(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
window.BK_CLOUD_PUBLIC = true; // cloud save + leaderboards on for everyone (28 Nov)
window.BK_CLOUD = {
  hidden,
  save: (code, handle, bed, state) => post("/save", { code, handle, bed, state }),
  load: code => j("/load?code=" + encodeURIComponent(code)),
  score: (code, game, score, secs) => post("/score", { code, game, score, secs }),
  board: (kind, period, game) => j("/board?kind=" + kind + "&period=" + period + (game ? "&game=" + game : "")),
};
})();
