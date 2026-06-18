<div id="particles-bg" class="fixed inset-0 pointer-events-none z-0 overflow-hidden">
</div>

@push('scripts')
<script>
document.addEventListener('DOMContentLoaded', function() {
    const canvas = document.createElement('canvas');
    canvas.className = 'w-full h-full';
    document.getElementById('particles-bg').appendChild(canvas);
    const ctx = canvas.getContext('2d');
    let stars = [];
    let mouseX = 0, mouseY = 0;

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    class Star {
        constructor() {
            this.reset();
        }
        reset() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.size = Math.random() * 2 + 0.5;
            this.opacity = Math.random() * 0.8 + 0.2;
            this.speed = Math.random() * 0.3 + 0.05;
            this.direction = Math.random() * Math.PI * 2;
        }
        update() {
            this.direction += (Math.random() - 0.5) * 0.01;
            this.x += Math.cos(this.direction) * this.speed;
            this.y += Math.sin(this.direction) * this.speed;
            if (this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height) {
                this.reset();
            }
            const dx = this.x - mouseX;
            const dy = this.y - mouseY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 150) {
                this.x += dx * 0.005;
                this.y += dy * 0.005;
            }
        }
        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
            ctx.fill();
        }
    }

    for (let i = 0; i < 150; i++) {
        stars.push(new Star());
    }

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        stars.forEach(star => {
            star.update();
            star.draw();
        });
        requestAnimationFrame(animate);
    }

    document.addEventListener('mousemove', e => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    animate();
});
</script>
@endpush
