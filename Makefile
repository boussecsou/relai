.PHONY: help doctor design serve check

help:
	@echo "make doctor  Check installed tools"
	@echo "make design  Rebuild design/relai-v1/index.html"
	@echo "make serve   Serve the mockup on http://127.0.0.1:4173"
	@echo "make check   Fail if the built mockup is out of date"

doctor:
	./scripts/doctor.sh

design:
	python3 design/relai-v1/build-preview.py

serve:
	python3 -m http.server 4173 --bind 127.0.0.1 --directory design/relai-v1

check:
	./scripts/check-design.sh
