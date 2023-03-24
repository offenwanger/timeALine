let index;

window.onload = function () {
    index = new URLSearchParams(window.location.search).get('index');
    if (!index) index = 1;

    let slides = document.getElementsByClassName("slide");
    let dotsDiv = document.getElementById("dots");
    for (let i = 1; i <= slides.length; i++) {
        const span = document.createElement('span');
        span.setAttribute('class', 'dot');
        span.onclick = () => { currentSlide(i) };
        dotsDiv.appendChild(span);
    }

    showSlides(index);
}

function plusSlides(n) {
    showSlides(index += n);
}

function currentSlide(n) {
    showSlides(index = n);
}

function showSlides(n) {
    let i;
    let slides = document.getElementsByClassName("slide");
    let dots = document.getElementsByClassName("dot");
    if (n > slides.length) { index = 1 }
    if (n < 1) { index = slides.length }
    for (i = 0; i < slides.length; i++) {
        slides[i].style.display = "none";
    }
    for (i = 0; i < dots.length; i++) {
        dots[i].className = dots[i].className.replace(" active", "");
    }
    slides[index - 1].style.display = "block";
    dots[index - 1].className += " active";

    history.replaceState({}, "", location.protocol + '//' + location.host + location.pathname + "?index=" + index);
}


