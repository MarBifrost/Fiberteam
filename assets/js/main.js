document.addEventListener("DOMContentLoaded", () => {

    // ==========================================
    // 📱 1. მობილური მენიუს მართვის ლოგიკა
    // ==========================================
    const menuBtn = document.getElementById('menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');

    if (menuBtn && mobileMenu) {
        const icon = menuBtn.querySelector('i');

        function toggleMenu() {
            mobileMenu.classList.toggle('hidden');
            if (mobileMenu.classList.contains('hidden')) {
                icon.className = 'fa-solid fa-bars';
            } else {
                icon.className = 'fa-solid fa-xmark';
            }
        }

        menuBtn.addEventListener('click', toggleMenu);

        const mobileLinks = mobileMenu.querySelectorAll('a');
        mobileLinks.forEach(link => {
            link.addEventListener('click', () => {
                if (!mobileMenu.classList.contains('hidden')) {
                    toggleMenu();
                }
            });
        });
    }

    // ==========================================
    // 🖼️ 2. გალერეის ძრავი (JSON + Swiper + Lightbox)
    // ==========================================
    let currentImageIndex = 0;
    let galleryData = [];

    const lightboxModal = document.getElementById('lightbox-modal');
    const lightboxImg = document.getElementById('lightbox-img');
    const galleryWrapper = document.getElementById('dynamic-gallery-wrapper');

    if (galleryWrapper) {
        fetch('data/gallery.json')
            .then(response => {
                if (!response.ok) throw new Error("JSON ფაილი ვერ მოიძებნა");
                return response.json();
            })
            .then(data => {
                galleryData = data;

                data.forEach((item, index) => {
                    const slide = document.createElement('div');
                    slide.className = 'swiper-slide cursor-pointer group relative rounded-xl overflow-hidden shadow-sm border border-gray-100';

                    // უსაფრთხო კლიკის ივენთი დუბლიკატების თავიდან ასაცილებლად
                    slide.addEventListener('click', () => openLightbox(index));

                    slide.innerHTML = `
                        <img src="${item.thumb}" loading="lazy" class="w-full h-64 object-cover group-hover:scale-105 transition duration-500" alt="Fiberteam Operation">
                        <div class="absolute inset-0 bg-blue-custom/20 opacity-0 group-hover:opacity-100 transition duration-300 flex items-center justify-center">
                            <i class="fa-solid fa-magnifying-glass-plus text-white text-2xl"></i>
                        </div>
                    `;
                    galleryWrapper.appendChild(slide);
                });

                initializeSwiper();
            })
            .catch(error => console.error("Error loading gallery data:", error));
    }

    function initializeSwiper() {
        new Swiper('.gallerySwiper', {
            slidesPerView: 1,
            spaceBetween: 16,
            grabCursor: true,
            loop: true,
            autoplay: {
                delay: 4000,
                disableOnInteraction: false,
            },
            pagination: {
                el: '.swiper-pagination',
                clickable: true,
            },
            navigation: {
                nextEl: '.swiper-next-btn',
                prevEl: '.swiper-prev-btn',
            },
            breakpoints: {
                500: { slidesPerView: 2, spaceBetween: 16 },
                768: { slidesPerView: 3, spaceBetween: 16 },
                1024: { slidesPerView: 4, spaceBetween: 16 }
            }
        });
    }

    // Lightbox ფუნქციები (window-ზე მიბმული HTML-ისთვის)
    window.openLightbox = function(index) {
        currentImageIndex = index;
        updateLightboxImage();
        if (lightboxModal) {
            lightboxModal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        }
    };

    function updateLightboxImage() {
        if (!lightboxImg || !galleryData[currentImageIndex]) return;
        const highResUrl = galleryData[currentImageIndex].large;
        lightboxImg.style.opacity = '0.5';
        lightboxImg.src = highResUrl;
        lightboxImg.onload = () => { lightboxImg.style.opacity = '1'; };
    }

    window.nextLightboxImage = function(event) {
        if (event) event.stopPropagation();
        currentImageIndex = (currentImageIndex + 1) % galleryData.length;
        updateLightboxImage();
    };

    window.prevLightboxImage = function(event) {
        if (event) event.stopPropagation();
        currentImageIndex = (currentImageIndex - 1 + galleryData.length) % galleryData.length;
        updateLightboxImage();
    };

    window.closeLightbox = function(event) {
        const contentBox = document.getElementById('lightbox-content');
        if (contentBox && !contentBox.contains(event.target)) {
            window.forceCloseLightbox();
        }
    };

    window.forceCloseLightbox = function() {
        if (lightboxModal) {
            lightboxModal.classList.add('hidden');
            document.body.style.overflow = '';
        }
    };

    // კლავიატურის ღილაკები
    document.addEventListener('keydown', (e) => {
        if (lightboxModal && !lightboxModal.classList.contains('hidden')) {
            if (e.key === "Escape") window.forceCloseLightbox();
            if (e.key === "ArrowRight") window.nextLightboxImage(e);
            if (e.key === "ArrowLeft") window.prevLightboxImage(e);
        }
    });

    // ==========================================
    // 📬 3. AJAX ფორმის გაგზავნის ძრავი (Standard POST)
    // ==========================================
    const quoteForm = document.getElementById('quote-form');
    if (quoteForm) {
        quoteForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const formResponse = document.getElementById('form-response');
            const submitBtn = document.getElementById('submit-btn');

            submitBtn.disabled = true;
            submitBtn.innerHTML = 'Sending Request... <i class="fa-solid fa-spinner animate-spin ml-2"></i>';

            // აგზავნის სტანდარტულ FormData-ს, PHP-სთვის მარტივი მისაღები რომ იყოს
            const formData = new FormData(this);

            fetch('send_email.php', {
                method: 'POST',
                body: formData // არანაირი JSON.stringify და Headers
            })
            .then(async response => {
                const result = await response.json();
                formResponse.classList.remove('hidden', 'bg-red-100', 'text-red-700', 'bg-green-100', 'text-green-700');

                if (response.ok) {
                    formResponse.classList.add('bg-green-100', 'text-green-700');
                    formResponse.innerText = result.message;
                    quoteForm.reset();
                } else {
                    formResponse.classList.add('bg-red-100', 'text-red-700');
                    formResponse.innerText = result.message || 'Something went wrong.';
                }
            })
            .catch(error => {
                formResponse.classList.remove('hidden');
                formResponse.classList.add('bg-red-100', 'text-red-700');
                formResponse.innerText = 'Network error. Please try again.';
            })
            .finally(() => {
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Submit Quote Request <i class="fa-solid fa-paper-plane ml-2 text-[10px]"></i>';
            });
        });
    }

    // ==========================================
    // 🔓 4. ფუტერის სერვისების View More / Less მართვა
    // ==========================================
    window.toggleFooterServices = function() {
        const content = document.getElementById('footer-more-services');
        const btn = document.getElementById('view-more-btn');
        if (!content || !btn) return;

        const btnText = btn.querySelector('span');
        const btnIcon = btn.querySelector('i');

        if (content.style.maxHeight && content.style.maxHeight !== '0px') {
            content.style.maxHeight = '0px';
            btnText.innerText = 'View All Services';
            btnIcon.style.transform = 'rotate(0deg)';
        } else {
            content.style.maxHeight = content.scrollHeight + "px";
            btnText.innerText = 'Show Less';
            btnIcon.style.transform = 'rotate(180deg)';
        }
    };

    // ==========================================
    // 🧭 5. მენიუს გაფერადება (Intersection Observer) & Smooth Scroll
    // ==========================================
    const navLinks = document.querySelectorAll("#desktop-menu [data-nav-link]");
    const sections = document.querySelectorAll("section[id], footer[id]");

    if (navLinks.length > 0 && sections.length > 0) {
        const observerOptions = {
            root: null,
            rootMargin: "-20% 0px -50% 0px",
            threshold: 0
        };

        const observer = new IntersectionObserver((entries) => {
            // ვამოწმებთ, მომხმარებელი საიტის სულ ბოლოში ხომ არ არის
            const isAtBottom = (window.innerHeight + window.scrollY) >= document.documentElement.scrollHeight - 50;

            // თუ ბოლოში ვართ, ობზერვერს ვუკრძალავთ მენიუს გადაწერას (რომ CONTACT არ ჩააქროს)
            if (isAtBottom) return;

            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const id = entry.target.getAttribute("id");

                    navLinks.forEach(link => {
                        if (link.getAttribute("href") === `#${id}`) {
                            link.classList.add("nav-link-active");
                        } else {
                            link.classList.remove("nav-link-active");
                        }
                    });
                }
            });
        }, observerOptions);

        sections.forEach(section => observer.observe(section));

        // 💡 დახვეწილი ლოგიკა საიტის ფსკერისთვის
        window.addEventListener("scroll", () => {
            const isAtBottom = (window.innerHeight + window.scrollY) >= document.documentElement.scrollHeight - 50;

            if (isAtBottom) {
                navLinks.forEach(link => {
                    if (link.getAttribute("href") === "#contact") {
                        link.classList.add("nav-link-active");
                    } else {
                        link.classList.remove("nav-link-active");
                    }
                });
            }
        });

        // Smooth Scroll ჯავასკრიპტით
        navLinks.forEach(link => {
            link.addEventListener("click", (e) => {
                e.preventDefault();
                const targetId = link.getAttribute("href");
                const targetSection = document.querySelector(targetId);

                if (targetSection) {
                    const headerHeight = document.querySelector("header").offsetHeight;
                    const targetPosition = targetSection.offsetTop - headerHeight;

                    window.scrollTo({
                        top: targetPosition,
                        behavior: "smooth"
                    });

                    history.pushState(null, null, targetId);
                }
            });
        });
    }

    // წლის ავტომატური განახლება ფუტერში
    const yearSpan = document.getElementById("year");
    if (yearSpan) yearSpan.textContent = new Date().getFullYear();
});