/* jshint esversion: 8 */
var md = new Remarkable();

document.querySelector('#helpContent').innerHTML = md.render(document.querySelector('textarea#content').value);
document.querySelector('textarea#content').remove();
document.querySelectorAll('#helpContent p').forEach((p) => {
    p.classList.add('mt-3');
});
document.querySelectorAll('#helpContent a').forEach((a) => {
    a.classList.add('text-white');
});
document.querySelectorAll('#helpContent img').forEach((img) => {
    img.closest('p').classList.add('text-center');
    img.classList.add('w-50');
});
document.querySelectorAll('#helpContent h2').forEach((h2) => {
    h2.classList.add('mt-2');
    h2.classList.add('pb-2');
    h2.classList.add('border-bottom');
});
document.querySelectorAll('#helpContent h3').forEach((h3) => {
    h3.classList.add('mt-2');
    h3.classList.add('pb-2');
    h3.classList.add('border-bottom');
});
