import { Router, type IRouter } from "express";
import healthRouter from "./health";
import productsRouter from "./products";
import categoriesRouter from "./categories";
import brandsRouter from "./brands";
import featuredBrandsRouter from "./featuredBrands";
import shopRouter from "./shop";
import adminRouter from "./admin";
import purchaseRequestsRouter from "./purchaseRequests";

const router: IRouter = Router();

router.use(healthRouter);
router.use(productsRouter);
router.use(categoriesRouter);
router.use(brandsRouter);
router.use(featuredBrandsRouter);
router.use(shopRouter);
router.use(adminRouter);
router.use(purchaseRequestsRouter);

export default router;
