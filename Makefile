.PHONY: help doctor serve check

help:
	@echo "make doctor  Check installed tools"
	@echo "make serve   Serve the mockup on http://127.0.0.1:4173/relai-inbox.html"
	@echo "make check   Fail on broken relative links in Markdown files"

doctor:
	./scripts/doctor.sh

serve:
	python3 -m http.server 4173 --bind 127.0.0.1 --directory design

check:
	./scripts/check-links.py
