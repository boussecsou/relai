.PHONY: help doctor design serve check

help:
	@echo "make doctor  Check available development tools"
	@echo "make serve   Serve index.html on http://127.0.0.1:4173"
	@echo "make check   Check the standalone prototype"
	@echo "make design  Alias for check; the HTML needs no build step"

doctor:
	./scripts/doctor.sh

design: check

serve:
	python3 -m http.server 4173 --bind 127.0.0.1

check:
	./scripts/check-design.sh
	python3 scripts/check-links.py
