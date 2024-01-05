import { all_songs } from "./music_list.js";

const $ = (query) => document.querySelector(query);

let music_list = all_songs;
let songs = [...music_list];
let prevIndex = [];
let songIndex = 0;
let songId = 0;
let repeat = false;
let random = false;
let login = false;

// Functions
const loadPlaylist = () => {
  let string = "";
  songs.forEach((song, i) => {
    string += `<li class="list-group-item"><i data-index=${i} data-id=${song[0]} class="fas fa-play"></i><span>${song[1]}</span></li>`;
  });
  $("#playlist").innerHTML = string;
  getDislikes();
};

const loadSong = async (song) => {
  const [artist, title] = song[1].split(" - ");
  songId = song[0];
  $(".artist").textContent = artist;
  $(".title").textContent = title;
  $("#audio").src = `/static/music/${song[1]}.mp3`;
  $("#playlist").children[prevIndex.at(-1)]?.classList.remove("active");
  $("#playlist").children[songIndex].classList.add("active");
  if ($("#logged-in")) {
    const data = await fetch(`/likes`);
    const response = await data.json();
    if (response.includes(song[0])) $("#like").classList.add("text-pink");
    else $("#like").classList.remove("text-pink");
  }
};

const playSong = () => {
  $("#play>i").classList.remove("fa-play");
  $("#play>i").classList.add("fa-pause");
  $("#audio").play();
};

const pauseSong = () => {
  $("#play>i").classList.add("fa-play");
  $("#play>i").classList.remove("fa-pause");
  $("#audio").pause();
};

const nextSong = () => {
  prevIndex.push(songIndex);
  songIndex = random
    ? Math.floor(Math.random() * songs.length)
    : songIndex === songs.length - 1
    ? 0
    : songIndex + 1;
  loadSong(songs[songIndex]);
  playSong();
};

const getDislikes = async () => {
  if ($("#logged-in") && !login) {
    const data = await fetch(`/dislikes`);
    const dislikes = await data.json();
    music_list = music_list.filter((song) => !dislikes.includes(song[0]));
    songs = [...music_list];
    login = true;
    loadPlaylist();
  } else if (!$("#logged-in")) login = false;
};

// Event listeners
$("#progress-container").addEventListener("click", (e) => {
  $("#audio").currentTime =
    (e.offsetX / $("#progress-container").clientWidth) * $("#audio").duration;
});

$("#navigation").addEventListener("click", (e) => {
  const id = e.target.id;
  const parentId = e.target.parentElement.id;
  if (id === "play" || parentId === "play") {
    $("#play>i").classList.contains("fa-pause") ? pauseSong() : playSong();
  } else if (id === "prev" || parentId === "prev") {
    prevIndex.push(songIndex);
    songIndex =
      prevIndex.length > 1
        ? prevIndex.at(-2)
        : songIndex
        ? songIndex - 1
        : songs.length - 1;
    loadSong(songs[songIndex]);
    playSong();
    prevIndex.pop();
    prevIndex.pop();
  } else if (id === "next" || parentId === "next") {
    nextSong();
  } else if (id === "repeat" || parentId === "repeat") {
    $("#repeat").classList.toggle("text-pink");
    repeat = !repeat;
  } else if (id === "random" || parentId === "random") {
    $("#random").classList.toggle("text-pink");
    random = !random;
  }
});

$("#playlist").addEventListener("click", (e) => {
  if (e.target.dataset.index) {
    prevIndex.push(songIndex);
    songIndex = +e.target.dataset.index;
    loadSong(songs[songIndex]);
    playSong();
  }
});

$("#audio").addEventListener("timeupdate", (e) => {
  const { duration, currentTime } = e.target;
  const min = Math.floor(currentTime / 60 || 0);
  const sec = Math.floor(currentTime % 60 || 0);
  $(".progress").style.width = `${(currentTime / duration) * 100}%`;
  $("#curr-time").textContent = min + ":" + (sec < 10 ? "0" + sec : sec);
});

$("#audio").addEventListener("loadedmetadata", (e) => {
  const duration = e.target.duration;
  const min = Math.floor(duration / 60 || 0);
  const sec = Math.floor(duration % 60 || 0);
  $("#dur-time").textContent = min + ":" + (sec < 10 ? "0" + sec : sec);
});

$("#audio").addEventListener("ended", () => (repeat ? playSong() : nextSong()));

$("#filter").addEventListener("keyup", (e) => {
  songs = music_list.filter((song) =>
    new RegExp(`${e.target.value.toLowerCase()}`).test(song[1].toLowerCase())
  );
  loadPlaylist();
  prevIndex = [];
  songIndex = 0;
});

$("#like-dislike").addEventListener("click", async (e) => {
  const id = e.target.id;
  if (id === "like") {
    $("#like").classList.toggle("text-pink");
    if (e.target.classList.contains("text-pink")) {
      fetch(`/likes`, { method: "POST", body: JSON.stringify(songId) });
    } else {
      fetch(`/likes`, { method: "DELETE", body: JSON.stringify(songId) });
    }
  } else if (id === "dislike") {
    fetch(`/dislikes`, {
      method: "POST",
      body: JSON.stringify(songId),
    });
    music_list = music_list.filter((song) => song[0] !== songId);
    songs = [...music_list];
    loadPlaylist();
  } else if (id === "liked-list") {
    const data = await fetch(`/likes`);
    const likes = await data.json();
    songs = music_list.filter((song) => likes.includes(song[0]));
    loadPlaylist();
  } else if (id === "disliked-list") {
    const data = await fetch(`/dislikes`);
    const dislikes = await data.json();
    songs = all_songs.filter((song) => dislikes.includes(song[0]));
    loadPlaylist();
  } else if (id === "all-music") {
    songs = music_list;
    loadPlaylist();
  }
});

// Execute when page loads
loadPlaylist();
loadSong(songs[0]);
